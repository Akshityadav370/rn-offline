const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let syncedSubmissions = [];
let syncHistory = [];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function printDivider() {
  console.log('\n' + '='.repeat(80) + '\n');
}

function printHeader(text) {
  console.log(`${colors.bright}${colors.blue}${text}${colors.reset}`);
}

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function printInfo(text) {
  console.log(`${colors.cyan}ℹ ${text}${colors.reset}`);
}

function printData(label, data) {
  console.log(`${colors.yellow}${label}:${colors.reset}`);
  console.log(JSON.stringify(data, null, 2));
}

app.get('/', (req, res) => {
  res.json({
    message: 'Offline Forms Sync API',
    version: '1.0.0',
    endpoints: {
      'POST /api/forms/sync': 'Sync form submissions',
      'GET /api/forms/history': 'Get sync history',
      'GET /api/forms/submissions': 'Get all synced submissions',
      'DELETE /api/forms/clear': 'Clear all data',
      'GET /api/health': 'Health check',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.post('/api/zoho-forms/sync', async (req, res) => {
  const { submissions } = req.body;
  if (!submissions || !Array.isArray(submissions)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'submissions array is required',
    });
  }

  const syncedIds = [];
  const failedSubmissions = [];

  for (const submission of submissions) {
    try {
      // Transform data to Zoho format
      const zohoData = transformToZohoFormat(submission.data);
      // Submit to Zoho Forms
      //   const result = await submitToZoho(zohoData, submission);
      const result = { success: true };

      if (result.success) {
        syncedIds.push(submission.id);
      } else {
        failedSubmissions.push({
          id: submission.id,
          error: result.error,
        });
      }
    } catch (error) {
      failedSubmissions.push({
        id: submission.id,
        error: error.message,
      });
    }
  }

  res.json({
    syncedIds,
    syncedCount: syncedIds.length,
    failedCount: failedSubmissions.length,
    failedSubmissions,
    timestamp: Date.now(),
  });
});

function transformToZohoFormat(data) {
  // Zoho forms typically expect URL-encoded form data
  const zohoData = {};

  // Map form fields to Zoho field names
  // Adjust these based on actual Zoho form field names

  if (data.SingleLine) zohoData.SingleLine = data.SingleLine;
  if (data.SingleLine4) zohoData.SingleLine4 = data.SingleLine4;
  if (data.SingleLine1) zohoData.SingleLine1 = data.SingleLine1;
  if (data.SingleLine3) zohoData.SingleLine3 = data.SingleLine3;
  if (data.SingleLine2) zohoData.SingleLine2 = data.SingleLine2;

  // Handle matrix fields (FLN data)
  if (data.matrix) {
    Object.keys(data.matrix).forEach((rowName) => {
      Object.keys(data.matrix[rowName]).forEach((colName) => {
        const fieldName = `${rowName}_${colName}`;
        zohoData[fieldName] = data.matrix[rowName][colName];
      });
    });
  }

  // Handle radio buttons
  if (data.Radio) zohoData.Radio = data.Radio;

  // Handle checkboxes (arrays)
  if (data.Checkbox && Array.isArray(data.Checkbox)) {
    zohoData.Checkbox = data.Checkbox.join(',');
  }
  if (data.Checkbox1 && Array.isArray(data.Checkbox1)) {
    zohoData.Checkbox1 = data.Checkbox1.join(',');
  }
  if (data.Checkbox2 && Array.isArray(data.Checkbox2)) {
    zohoData.Checkbox2 = data.Checkbox2.join(',');
  }
  if (data.Checkbox3 && Array.isArray(data.Checkbox3)) {
    zohoData.Checkbox3 = data.Checkbox3.join(',');
  }

  // Handle rating
  if (data.Rating) zohoData.Rating = data.Rating;

  // Handle multiline text
  if (data.MultiLine) zohoData.MultiLine = data.MultiLine;

  return zohoData;
}

// Submit to Zoho Forms API
async function submitToZoho(zohoData, originalSubmission) {
  try {
    // IMPORTANT: Replace with your actual Zoho Form submission URL
    // You can get this from Zoho Forms > Share > Webhook URL
    // Or use the form submission endpoint

    const ZOHO_FORM_SUBMIT_URL =
      'https://forms.zoho.in/content/form/TeachersfeedbackformFLNimplementation2025';

    // Option 1: Direct form submission (simulate browser form post)
    const formData = new URLSearchParams();
    Object.keys(zohoData).forEach((key) => {
      formData.append(key, zohoData[key]);
    });

    const response = await fetch(ZOHO_FORM_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log(`Zoho response status: ${response.status}`);

    // Zoho might return HTML success page or redirect
    // Check for success indicators
    if (response.ok || response.status === 302) {
      return { success: true };
    }

    const text = await response.text();

    // Check if response contains success indicators
    if (text.includes('success') || text.includes('submitted')) {
      return { success: true };
    }

    return {
      success: false,
      error: `Unexpected response: ${response.status}`,
    };
  } catch (error) {
    console.error('Zoho submission error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Alternative: Using Zoho API (if you have API access)
async function submitToZohoAPI(zohoData, originalSubmission) {
  try {
    // If you have Zoho Forms API access, use this method
    const ZOHO_API_URL = 'YOUR_ZOHO_API_ENDPOINT';
    const ZOHO_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';

    const response = await fetch(ZOHO_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(zohoData),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    }

    return {
      success: false,
      error: `API error: ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

app.post('/api/forms/sync', (req, res) => {
  try {
    const { submissions } = req.body;

    if (!submissions || !Array.isArray(submissions)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'submissions must be an array',
      });
    }

    printDivider();

    const syncedIds = [];
    const errors = [];

    // Process each submission
    submissions.forEach((submission, index) => {
      console.log(
        `\n${colors.magenta}Processing Submission ${index + 1}/${
          submissions.length
        }${colors.reset}`
      );
      console.log(`${colors.cyan}─${'─'.repeat(78)}${colors.reset}`);

      try {
        // Validate submission structure
        if (!submission.id || !submission.data) {
          throw new Error('Missing required fields: id or data');
        }

        printInfo(`Submission ID: ${submission.id}`);
        printInfo(`Form ID: ${submission.formId || 'N/A'}`);
        printInfo(
          `Timestamp: ${new Date(submission.timestamp).toLocaleString()}`
        );

        printData('Form Data', submission.data);

        // Store in memory
        syncedSubmissions.push({
          ...submission,
          syncedAt: new Date().toISOString(),
          syncId: `sync-${Date.now()}-${index}`,
        });

        syncedIds.push(submission.id);
        printSuccess(`Submission ${submission.id} synced successfully`);
      } catch (error) {
        console.error(
          `${colors.red}✗ Error processing submission: ${error.message}${colors.reset}`
        );
        errors.push({
          submissionId: submission.id,
          error: error.message,
        });
      }
    });

    // Store sync history
    const syncRecord = {
      timestamp: new Date().toISOString(),
      totalSubmissions: submissions.length,
      successCount: syncedIds.length,
      errorCount: errors.length,
      syncedIds,
      errors: errors.length > 0 ? errors : undefined,
    };

    syncHistory.push(syncRecord);

    // Print summary
    console.log(`\n${colors.bright}${colors.blue}SYNC SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(80)}${colors.reset}`);
    printSuccess(
      `Total: ${submissions.length} | Synced: ${syncedIds.length} | Failed: ${errors.length}`
    );

    if (errors.length > 0) {
      console.log(`\n${colors.yellow}Errors:${colors.reset}`);
      errors.forEach((err) => {
        console.log(`  - ${err.submissionId}: ${err.error}`);
      });
    }

    printDivider();

    // Send response
    res.json({
      success: true,
      message: 'Sync completed',
      syncedIds,
      totalProcessed: submissions.length,
      successCount: syncedIds.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `${colors.red}✗ Sync failed: ${error.message}${colors.reset}`
    );
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message,
    });
  }
});

app.get('/api/forms/history', (req, res) => {
  printInfo('📊 Sync history requested');

  res.json({
    totalSyncs: syncHistory.length,
    history: syncHistory.reverse(), // Most recent first
  });
});

app.get('/api/forms/submissions', (req, res) => {
  printInfo('📋 All submissions requested');

  res.json({
    total: syncedSubmissions.length,
    submissions: syncedSubmissions,
  });
});

app.delete('/api/forms/clear', (req, res) => {
  const submissionCount = syncedSubmissions.length;
  const historyCount = syncHistory.length;

  syncedSubmissions = [];
  syncHistory = [];

  printDivider();
  printInfo(`Cleared ${submissionCount} submissions`);
  printInfo(`Cleared ${historyCount} sync records`);
  printDivider();

  res.json({
    success: true,
    message: 'All data cleared',
    clearedSubmissions: submissionCount,
    clearedHistory: historyCount,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.clear();
  printDivider();
  printSuccess(`Server running on http://localhost:${PORT}`);
  printSuccess(`API ready to receive sync requests`);
  printDivider();

  console.log(`${colors.bright}Available Endpoints:${colors.reset}`);
  console.log(
    `  ${colors.cyan}POST${colors.reset}   http://localhost:${PORT}/api/forms/sync`
  );
  console.log(
    `  ${colors.green}GET${colors.reset}    http://localhost:${PORT}/api/forms/history`
  );
  console.log(
    `  ${colors.green}GET${colors.reset}    http://localhost:${PORT}/api/forms/submissions`
  );
  console.log(
    `  ${colors.yellow}DELETE${colors.reset} http://localhost:${PORT}/api/forms/clear`
  );
  console.log(
    `  ${colors.green}GET${colors.reset}    http://localhost:${PORT}/api/health`
  );

  printDivider();
  printInfo('Waiting for sync requests...');
  printDivider();
});

process.on('SIGTERM', () => {
  printInfo('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    printSuccess('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  printInfo('\nSIGINT signal received: closing HTTP server');
  app.close(() => {
    printSuccess('HTTP server closed');
  });
  process.exit(0);
});
