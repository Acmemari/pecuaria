import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('Enriching agent_registry with system_prompt column...');

    // Since we can't run raw SQL easily via the client without an RPC, 
    // we'll try to use the REST API to update rows if the column exists,
    // but first we need to ensure the column exists.

    // NOTE: If the user has the Supabase CLI or Dashboard, they should run the .sql file.
    // But I will try to at least UPSERT the agents so they appear in the UI.

    const agents = [
        {
            id: 'feedback',
            version: '1.0.0',
            name: 'Assistente de Feedback',
            description: 'Gera, reescreve e adapta feedbacks construtivos com modelos profissionais.',
            default_provider: 'anthropic',
            default_model: 'claude-3-haiku-20240307',
            status: 'active'
        },
        {
            id: 'damages-gen',
            version: '1.0.0',
            name: 'Gerenciador de Prejuízos',
            description: 'Gera uma descrição de prejuízos baseada em um ocorrido.',
            default_provider: 'gemini',
            default_model: 'gemini-1.5-flash',
            status: 'active'
        }
    ];

    console.log('Upserting agents to registry...');
    for (const agent of agents) {
        const { error } = await supabase
            .from('agent_registry')
            .upsert(agent, { onConflict: 'id,version' });

        if (error) {
            console.error(`Error upserting ${agent.id}:`, error.message);
        } else {
            console.log(`Agent ${agent.id} upserted successfully.`);
        }
    }

    console.log('\n--- IMPORTANT ---');
    console.log('Manual Action Required: Please run the SQL migration in your Supabase Dashboard SQL Editor:');
    console.log('File: supabase/migrations/20260222130000_agent_editable_prompts.sql');
    console.log('------------------\n');
}

applyMigration();
