/**
 * Salesforce to Supabase Sync Script
 *
 * This script syncs session data from Salesforce to Supabase.
 * It can be run manually or via GitHub Actions on a schedule.
 *
 * Environment variables required:
 * - SALESFORCE_LOGIN_URL (e.g., https://login.salesforce.com or https://test.salesforce.com)
 * - SALESFORCE_USERNAME
 * - SALESFORCE_PASSWORD
 * - SALESFORCE_SECURITY_TOKEN
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 * - FULL_SYNC (optional, 'true' for full historical sync)
 */

const jsforce = require('jsforce');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
  // How many days back to sync for incremental updates
  incrementalDays: 7,
  // Batch size for Supabase upserts
  batchSize: 100,
  // Salesforce object name - ServiceAppointment (Field Service)
  salesforceObject: 'ServiceAppointment',
};

// Field mapping from Salesforce to Supabase
// MINIMAL SYNC: Only sync new fields (goals, plan, summary)
// All other fields preserved from existing Zapier data
const FIELD_MAPPING = {
  // Required for matching
  'AppointmentNumber': 'appointment_number',

  // New fields to add (goals, plan, summary only)
  'Notes__c': 'summary',                   // Session summary
  'Goals__c': 'goals',                     // Goals discussed
  'Plan__c': 'plan',                       // Action plan
};

// Initialize clients
let salesforceConn = null;
let supabase = null;

async function initializeClients() {
  console.log('Initializing Salesforce connection...');

  salesforceConn = new jsforce.Connection({
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
  });

  await salesforceConn.login(
    process.env.SALESFORCE_USERNAME,
    process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN
  );

  console.log('Salesforce connected successfully');

  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('Supabase client initialized');
}

function buildSalesforceQuery(isFullSync) {
  const fields = Object.keys(FIELD_MAPPING).join(', ');
  let query = `SELECT ${fields} FROM ${CONFIG.salesforceObject}`;

  if (!isFullSync) {
    // Incremental sync: only get records modified in last N days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.incrementalDays);
    const isoDate = cutoffDate.toISOString();
    query += ` WHERE LastModifiedDate >= ${isoDate}`;
  }

  query += ' ORDER BY CreatedDate DESC';

  return query;
}

function mapRecord(sfRecord) {
  const mapped = {};

  for (const [sfField, supabaseColumn] of Object.entries(FIELD_MAPPING)) {
    let value = sfRecord[sfField];

    // Handle special transformations
    if (supabaseColumn === 'status' && value) {
      // Normalize status values to match Supabase
      const statusMap = {
        'completed': 'Completed',
        'scheduled': 'Upcoming',
        'dispatched': 'Upcoming',
        'in progress': 'Upcoming',
        'canceled': 'Cancelled',
        'cancelled': 'Cancelled',
        'cannot complete': 'Cancelled',
        'no show': 'No Show',
      };
      value = statusMap[value.toLowerCase()] || value;
    }

    // Multi-select picklists - preserve actual text values (e.g., "Motivating teams")
    // Don't transform these - keep the original Salesforce values

    // Handle dates - SchedStartTime is a datetime
    if (supabaseColumn === 'session_date' && value) {
      value = new Date(value).toISOString().split('T')[0];
    }

    if (supabaseColumn === 'created_at' && value) {
      value = new Date(value).toISOString();
    }

    mapped[supabaseColumn] = value ?? null;
  }

  return mapped;
}

async function fetchSalesforceRecords(isFullSync) {
  const query = buildSalesforceQuery(isFullSync);
  console.log('Executing Salesforce query:', query);

  const records = [];

  return new Promise((resolve, reject) => {
    salesforceConn.query(query)
      .on('record', (record) => {
        records.push(mapRecord(record));
      })
      .on('end', () => {
        console.log(`Fetched ${records.length} records from Salesforce`);
        resolve(records);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run({ autoFetch: true, maxFetch: 100000 });
  });
}

async function updateExistingRecords(records) {
  if (records.length === 0) {
    console.log('No records to update');
    return { updated: 0, skipped: 0, errors: 0 };
  }

  console.log(`Processing ${records.length} Salesforce records...`);
  console.log('Updating only existing records in Supabase (no inserts)...');

  let totalUpdated = 0;
  let errorCount = 0;
  const CONCURRENCY = 50; // Run 50 updates in parallel

  // Process records in parallel batches
  for (let i = 0; i < records.length; i += CONCURRENCY) {
    const batch = records.slice(i, i + CONCURRENCY);

    const promises = batch.map(async (record) => {
      const { appointment_number, ...updateData } = record;
      if (!appointment_number) return { success: false };

      const { error } = await supabase
        .from('session_tracking')
        .update(updateData)
        .eq('appointment_number', appointment_number);

      return { success: !error, error };
    });

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result.success) {
        totalUpdated++;
      } else if (result.error) {
        errorCount++;
      }
    }

    // Log progress every 1000 records
    const processed = Math.min(i + CONCURRENCY, records.length);
    if (processed % 1000 < CONCURRENCY || processed === records.length) {
      console.log(`Progress: ${processed}/${records.length} records processed`);
    }
  }

  if (errorCount > 0) {
    console.error(`Completed with ${errorCount} errors`);
  }

  return { updated: totalUpdated, skipped: 0, errors: errorCount };
}

async function main() {
  const startTime = Date.now();
  const isFullSync = process.env.FULL_SYNC === 'true';

  console.log('='.repeat(50));
  console.log(`Salesforce Sync Started - ${new Date().toISOString()}`);
  console.log(`Mode: ${isFullSync ? 'FULL SYNC' : 'Incremental'}`);
  console.log('='.repeat(50));

  try {
    await initializeClients();

    const records = await fetchSalesforceRecords(isFullSync);

    if (records.length === 0) {
      console.log('No new or modified records to sync');
      return;
    }

    const result = await updateExistingRecords(records);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('='.repeat(50));
    console.log('Sync Complete!');
    console.log(`Records updated: ${result.updated}`);
    console.log(`Records skipped (not in Supabase): ${result.skipped}`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(50));

    if (result.errors > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
