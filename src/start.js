// Runs the WhatsApp bot and the payment webhook listener together, so they
// share the same DATA_DIR/disk and there's no cross-service sync problem.
// Render's "web" service type requires something listening on $PORT, which
// webhookServer.js does — so this combined process satisfies that while
// also keeping the bot connection alive in the background.
require('./index');
require('./services/webhookServer');
