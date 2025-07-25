// Enable Blocking Service
// Run this after fixing database permissions

import { enableBlockingService } from './lib/blockingService';

// Enable the blocking service
enableBlockingService();

console.log('✅ Blocking service has been enabled!');
console.log('✅ All blocking functionality should now work properly.'); 