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
  // Salesforce object name - UPDATE THIS to match your org
  salesforceObject: 'Coaching_Session__c',
};

// Field mapping from Salesforce to Supabase
// UPDATE THESE to match your Salesforce field API names
const FIELD_MAPPING = {
  // Salesforce field -> Supabase column
  'Id': 'salesforce_id',
  'Employee__c': 'employee_id',
  'Employee_Name__c': 'employee_name',
  'Session_Date__c': 'session_date',
  'Status__c': 'status',
  'Coach_Name__c': 'coach_name',
  'Leadership_Management_Skills__c': 'leadership_management_skills',
  'Communication_Skills__c': 'communication_skills',
  'Mental_Well_Being__c': 'mental_well_being',
  'Other_Themes__c': 'other_themes',
  'Summary__c': 'summary',
  'Goals__c': 'goals',
  'Plan__c': 'plan',
  'Duration_Minutes__c': 'duration_minutes',
  'Company__c': 'company_id',
  'Account_Name__c': 'account_name',
  'Program_Name__c': 'program_name',
  'Program_Title__c': 'program_title',
  'Appointment_Number__c': 'appointment_number',
  'CreatedDate': 'created_at',
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
      // Normalize status values
      const statusMap = {
        'completed': 'Completed',
        'upcoming': 'Upcoming',
        'cancelled': 'Cancelled',
        'no show': 'No Show',
        'no_show': 'No Show',
      };
      value = statusMap[value.toLowerCase()] || value;
    }

    // Convert boolean strings
    if (['leadership_management_skills', 'communication_skills', 'mental_well_being'].includes(supabaseColumn)) {
      value = value === true || value === 'true' || value === '1';
    }

    // Handle dates
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
      .run({ autoFetch: true, maxFetch: 10000 });
  });
}

async function upsertToSupabase(records) {
  if (records.length === 0) {
    console.log('No records to upsert');
    return { inserted: 0, updated: 0 };
  }

  console.log(`Upserting ${records.length} records to Supabase...`);

  let totalProcessed = 0;
  let errors = [];

  // Process in batches
  for (let i = 0; i < records.length; i += CONFIG.batchSize) {
    const batch = records.slice(i, i + CONFIG.batchSize);

    const { data, error } = await supabase
      .from('session_tracking')
      .upsert(batch, {
        onConflict: 'salesforce_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`Error upserting batch ${i / CONFIG.batchSize + 1}:`, error);
      errors.push(error);
    } else {
      totalProcessed += batch.length;
      console.log(`Processed batch ${Math.floor(i / CONFIG.batchSize) + 1}: ${batch.length} records`);
    }
  }

  if (errors.length > 0) {
    console.error(`Completed with ${errors.length} errors`);
  }

  return { processed: totalProcessed, errors: errors.length };
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

    const result = await upsertToSupabase(records);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('='.repeat(50));
    console.log('Sync Complete!');
    console.log(`Records processed: ${result.processed}`);
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
