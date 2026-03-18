import { Message, Client } from 'whatsapp-web.js';
import { supabase } from '../services/supabase';
import { parsePrintIntent } from '../services/aiParser';
import dotenv from 'dotenv';
dotenv.config();

const SHOP_ID = process.env.SHOP_ID || '';

export async function handleIncomingMessage(msg: Message, client: Client) {
  const phone = msg.from;

  // Verify Shop ID
  if (!SHOP_ID) {
    console.warn("SHOP_ID not configured.");
    return;
  }

  // Find or Create session
  let { data: session } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('shop_id', SHOP_ID)
    .eq('phone', phone)
    .single();

  if (!session) {
    // If no session, create one
    // Also ensure customer exists
    await supabase.from('customers').upsert(
      { shop_id: SHOP_ID, phone: phone },
      { onConflict: 'shop_id, phone' }
    );

    const { data: newSession } = await supabase
      .from('whatsapp_sessions')
      .insert({ shop_id: SHOP_ID, phone: phone, state: 'WAIT_FILE', context: {} })
      .select()
      .single();
    
    session = newSession;

    // Send Welcome Message
    const { data: settings } = await supabase.from('shop_settings').select('auto_reply_message').eq('shop_id', SHOP_ID).single();
    const reply = settings?.auto_reply_message || "Welcome to PrintOS! Please send the file you want to print.";
    await msg.reply(reply);
    return;
  }

  // Reset conversation if user says "cancel"
  if (msg.body.toLowerCase() === 'cancel') {
    await supabase.from('whatsapp_sessions').update({ state: 'WAIT_FILE', context: {} }).eq('id', session.id);
    await msg.reply('Session cancelled. Send a new file whenever you are ready.');
    return;
  }

  // State Machine
  switch (session.state) {
    case 'WAIT_FILE':
      if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        if (media) {
          // In production, upload via buffer to Supabase Storage
          // Example: supabase.storage.from('print_files').upload(...)
          const fileName = `order_${Date.now()}_${msg.id.id}`;
          const buffer = Buffer.from(media.data, 'base64');
          
          await supabase.storage.from('print_files').upload(`${SHOP_ID}/${fileName}`, buffer, {
            contentType: media.mimetype
          });
          
          const { data: publicUrlData } = supabase.storage.from('print_files').getPublicUrl(`${SHOP_ID}/${fileName}`);
          
          // Update context
          const context = { ...session.context, fileUrl: publicUrlData.publicUrl, fileName: media.filename || fileName, mime: media.mimetype };
          await supabase.from('whatsapp_sessions').update({ state: 'WAIT_REQUIREMENTS', context }).eq('id', session.id);
          
          await msg.reply('File received! How would you like it printed?\nE.g., "2 copies, color, double-sided, binding."');
        } else {
          await msg.reply('Failed to download media. Please try again.');
        }
      } else {
        await msg.reply('Please send a document (PDF, Word, or Image).');
      }
      break;

    case 'WAIT_REQUIREMENTS': {
      // Use AI to parse requirements
      await msg.reply("Processing your requirements...");
      const previousContextText = JSON.stringify(session.context);
      const parsedIntent = await parsePrintIntent(msg.body, previousContextText);

      if (parsedIntent.confidence > 0.5) {
        const mergedContext = { ...session.context, requirements: parsedIntent };
        await supabase.from('whatsapp_sessions').update({ state: 'WAIT_CONFIRMATION', context: mergedContext }).eq('id', session.id);
        
        const summary = `
*Order Summary:*
- File: ${mergedContext.fileName}
- Copies: ${parsedIntent.copies || 1}
- Color: ${parsedIntent.color_mode || 'bw'}
- Duplex: ${parsedIntent.duplex ? 'Yes' : 'No'}
- Binding: ${parsedIntent.binding || 'none'}
- Urgency: ${parsedIntent.urgency || 'normal'}

Reply "YES" to confirm or "CANCEL" to start over.
        `;
        await msg.reply(summary.trim());
      } else {
        await msg.reply("I couldn't quite understand. Could you please specify: copies, color/bw, single/double sided?");
      }
      break;
    }

    case 'WAIT_CONFIRMATION': {
      if (msg.body.toLowerCase().includes('yes')) {
        const { data: settings } = await supabase.from('shop_settings').select('*').eq('shop_id', SHOP_ID).single();
        
        if (!settings) {
          await msg.reply('Shop settings not configured. Please contact the shop owner.');
          break;
        }

        const req = session.context.requirements;
        const pricePerPage = req.color_mode === 'color' ? (settings.color_price || 10) : (settings.bw_price || 2);
        // Page count: in production use pdf-parse. Using AI-extracted page_range as estimate.
        const pages = 1;
        
        let subtotal = (pricePerPage * pages * (req.copies || 1));
        if (req.binding && req.binding !== 'none') subtotal += (settings.binding_price || 20);
        if (req.urgency === 'urgent') subtotal += (settings.urgent_fee || 50);

        const { data: customerInfo } = await supabase.from('customers').select('id').eq('shop_id', SHOP_ID).eq('phone', phone).single();
        const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Parse pickup_time string from AI if present
        let pickupTimestamp: Date | null = null;
        if (req.pickup_time && req.pickup_time !== 'none') {
          const parsed = new Date(req.pickup_time);
          if (!isNaN(parsed.getTime())) pickupTimestamp = parsed;
        }

        const { data: orderParams } = await supabase.from('orders').insert({
          shop_id: SHOP_ID,
          customer_id: customerInfo?.id,
          short_id: shortId,
          status: 'RECEIVED',
          color_mode: req.color_mode || 'bw',
          copies: req.copies || 1,
          page_range: req.page_range || 'all',
          duplex: req.duplex || false,
          binding: req.binding || 'none',
          urgency: req.urgency || 'normal',
          pickup_time: pickupTimestamp,
          subtotal: subtotal,
          total_amount: subtotal
        }).select('id').single();

        if (orderParams?.id) {
          await supabase.from('order_files').insert({
            order_id: orderParams.id,
            file_url: session.context.fileUrl,
            file_name: session.context.fileName,
            file_type: session.context.mime,
            pages: pages
          });

          // Update customer stats (best-effort, don't fail the order)
          try {
            await supabase.rpc('increment_customer_stats', {
              p_shop_id: SHOP_ID,
              p_phone: phone,
              p_spend: subtotal
            });
          } catch (_) { /* non-critical */ }

          await msg.reply(`✅ Order Confirmed! Your tracking ID is *${shortId}*.\nTotal: ₹${subtotal.toFixed(2)}\nYour print is now in the queue!`);
          await supabase.from('whatsapp_sessions').update({ state: 'WAIT_FILE', context: {} }).eq('id', session.id);
        } else {
          await msg.reply('Sorry, something went wrong creating your order. Please try again.');
        }
      } else {
        await msg.reply('Reply "YES" to confirm or "CANCEL" to start over.');
      }
      break;
    }

    default:
      await supabase.from('whatsapp_sessions').update({ state: 'WAIT_FILE' }).eq('id', session.id);
      break;
  }
}
