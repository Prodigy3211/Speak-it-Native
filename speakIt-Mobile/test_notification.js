// Test script to verify the send-notification Edge Function
// Run this in your browser console or as a Node.js script

const testNotification = async () => {
  const response = await fetch('https://qdpammoeepwgapqyfrrh.supabase.co/functions/v1/send-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: '8c76b611-6364-4279-a64b-5aa81b3e3e57', // Replace with a real user ID
      title: 'Test Notification',
      body: 'This is a test notification',
      data: {
        type: 'test',
        claim_id: 'test-claim-id'
      }
    })
  });

  const result = await response.json();
  console.log('Notification test result:', result);
  return result;
};

// Run the test
testNotification().catch(console.error); 