import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { print } from 'pdf-to-printer';

dotenv.config();

const API_URL = process.env.BACKEND_API_URL || 'http://localhost:4000/api';
const SHOP_ID = process.env.SHOP_ID || '';
const PRINTER_NAME = process.env.PRINTER_NAME || undefined; // If undefined, uses default printer
const POLL_INTERVAL = 5000;

let isProcessing = false;

interface OrderFile {
  file_url: string;
  file_name: string;
  file_type: string;
}

interface Job {
  id: string;
  short_id: string;
  status: string;
  color_mode: string;
  copies: number;
  page_range: string;
  duplex: boolean;
  order_files: OrderFile[];
}

async function downloadFile(url: string, destPath: string) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    writer.on('finish', () => resolve(undefined));
    writer.on('error', reject);
  });
}

async function updateJobStatus(jobId: string, status: string) {
  try {
    await axios.post(`${API_URL}/print-jobs/${jobId}/status`, { status });
    console.log(`Job ${jobId} status updated to ${status}`);
  } catch (error) {
    console.error(`Error updating job ${jobId} status:`, error);
  }
}

async function processJobs() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // 1. Fetch pending jobs
    const response = await axios.get(`${API_URL}/print-jobs/${SHOP_ID}`);
    const jobs: Job[] = response.data.jobs || [];

    for (const job of jobs) {
      console.log(`Processing job ${job.short_id}...`);
      
      // Update status to processing
      if (job.status !== 'PROCESSING') {
        await updateJobStatus(job.id, 'PROCESSING');
      }

      let jobPrinted = true;

      // Download and print files
      for (const file of job.order_files) {
        if (!file.file_url) continue;

        const tempDir = path.join(__dirname, '..', 'tmp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const ext = path.extname(file.file_name) || '.pdf';
        const localPath = path.join(tempDir, `${job.short_id}_${Date.now()}${ext}`);

        console.log(`Downloading ${file.file_name} to ${localPath}...`);
        await downloadFile(file.file_url, localPath);

        console.log(`Printing ${localPath}...`);
        
        const printOptions: any = {};
        if (PRINTER_NAME) printOptions.printer = PRINTER_NAME;
        if (job.copies > 1) printOptions.copies = job.copies;
        // FIXED: duplex:true means double-sided printing (was incorrectly set to 'simplex')
        if (job.duplex) printOptions.duplex = 'duplex';
        else printOptions.duplex = 'simplex';
        if (job.color_mode === 'color') printOptions.color = true;

        try {
          await print(localPath, printOptions);
          console.log(`Print sent to queue for ${file.file_name}`);
        } catch (printErr) {
          console.error(`Printer Error for ${file.file_name}:`, printErr);
          jobPrinted = false;
        } finally {
          // Always cleanup temp file
          try { fs.unlinkSync(localPath); } catch(e) {}
        }
      }

      // Only mark as PRINTED if all files succeeded
      if (jobPrinted) {
        await updateJobStatus(job.id, 'PRINTED');
      } else {
        console.error(`Job ${job.short_id} had print errors, not marking as PRINTED.`);
      }
    }

  } catch (error: any) {
    console.error('Error polling jobs:', error.message);
  } finally {
    isProcessing = false;
  }
}

console.log('Local Print Agent Started.');
console.log(`Polling backend (${API_URL}) for shop ${SHOP_ID} every ${POLL_INTERVAL}ms`);

setInterval(processJobs, POLL_INTERVAL);
