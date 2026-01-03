/** @format */

import { NextRequest, NextResponse } from 'next/server';
import { withTraceContext } from '@/lib/with-trace-context';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/sync
 * 
 * Processes offline queue items sent by the service worker.
 * This endpoint handles create, update, and delete operations.
 */
export const POST = withTraceContext(async (request: NextRequest) => {
    try {
        const operation = await request.json();

        if (!operation || !operation.operation || !operation.collection) {
            return NextResponse.json(
                { error: 'Invalid operation format' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        switch (operation.operation) {
            case 'create': {
                if (!operation.data) {
                    return NextResponse.json(
                        { error: 'Create operation requires data' },
                        { status: 400 }
                    );
                }

                const { error } = await supabase
                    .from(operation.collection)
                    .insert(operation.data);

                if (error) throw error;
                break;
            }

            case 'update': {
                if (!operation.data || !operation.docId) {
                    return NextResponse.json(
                        { error: 'Update operation requires data and docId' },
                        { status: 400 }
                    );
                }

                const { id: _id, ...updateData } = operation.data;
                const { error } = await supabase
                    .from(operation.collection)
                    .update(updateData)
                    .eq('id', operation.docId);

                if (error) throw error;
                break;
            }

            case 'delete': {
                if (!operation.docId) {
                    return NextResponse.json(
                        { error: 'Delete operation requires docId' },
                        { status: 400 }
                    );
                }

                const { error } = await supabase
                    .from(operation.collection)
                    .delete()
                    .eq('id', operation.docId);

                if (error) throw error;
                break;
            }

            default:
                return NextResponse.json(
                    { error: `Unknown operation type: ${operation.operation}` },
                    { status: 400 }
                );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Sync operation failed:', error);
        return NextResponse.json(
            { error: 'Sync operation failed', details: String(error) },
            { status: 500 }
        );
    }
});
