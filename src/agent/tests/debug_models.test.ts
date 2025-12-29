
import { describe, it } from 'bun:test';
import { createOpencode } from '@opencode-ai/sdk';

describe('Debug Models', () => {
    it('should list available models', async () => {
        const { client, server } = await createOpencode({ port: 0 });

        try {
            const providers = await client.provider.list();
            console.log("Providers:", JSON.stringify(providers.data, null, 2));
        } finally {
            server.close();
        }
    });
});
