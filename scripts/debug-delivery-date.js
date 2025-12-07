// Test what happens with "Custom" region and the **as** type cast
function calculateNextDeliveryDate(region, orderDate) {
  const deliveryDaysA = [0, 2, 4]; // Sunday, Tuesday, Thursday
  const deliveryDaysB = [1, 3]; // Monday, Wednesday
  const deliveryDays = region === "A" ? deliveryDaysA : deliveryDaysB;

  console.log('  region =', region);
  console.log('  region === "A"?', region === "A");
  console.log('  region === "B"?', region === "B");
  console.log('  Selected deliveryDays =', deliveryDays);

  let deliveryDate = new Date(orderDate);
  deliveryDate.setHours(0, 0, 0, 0);

  if (deliveryDays.includes(orderDate.getDay()) && orderDate.getHours() >= 18) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  while (!deliveryDays.includes(deliveryDate.getDay())) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  return deliveryDate;
}

console.log('\n=========== THE SMOKING GUN! ===========');
console.log('What happens when region = "Custom" is passed?');
console.log('');

const testDate = new Date('2025-11-26T11:00:00+02:00');
console.log('Input: Wednesday Nov 26, 2025 at 11 AM');
console.log('');

console.log('Test 1: region = "Custom" (what likely happened)');
const result1 = calculateNextDeliveryDate('Custom', testDate);
console.log('  Result:', result1.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
console.log('');

console.log('Test 2: region = "B" (what should have happened)');
const result2 = calculateNextDeliveryDate('B', testDate);
console.log('  Result:', result2.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
console.log('');

console.log('Test 3: region = "A" (for comparison)');
const result3 = calculateNextDeliveryDate('A', testDate);
console.log('  Result:', result3.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
