let selectedPayment = 'COD';
let couponDiscount = 0;
let appliedCoupon = '';
let checkoutData = null;

// Load checkout data (cart items + totals)
async function loadPaymentData() {
  const res = await fetch('/api/users/orders/checkout-data');

  if (!res.ok) {
    const data = await res.json();
    showToast(data.message || 'Failed to load order data', 'error');
    setTimeout(() => window.location.href = '/cart', 1500);
    return;
  }

  checkoutData = await res.json();
  renderOrderSummaryItems(checkoutData.items);
  updateSummaryTotals();
}

function renderOrderSummaryItems(items) {
  const container = document.getElementById('orderSummaryItems');
  container.innerHTML = '';

  items.forEach(item => {
    const p = item.product;
    const div = document.createElement('div');
    div.className = 'order-summary-item';
    div.innerHTML = `
      <img src="${p.images[0]}" class="order-summary-img" alt="${p.name}">
      <div class="flex-grow-1">
        <p class="order-summary-name">${p.name}</p>
        <p class="order-summary-price">₹${item.price.toLocaleString()} × ${item.quantity}</p>
      </div>
      <span class="order-summary-total">₹${(item.price * item.quantity).toLocaleString()}</span>`;
    container.appendChild(div);
  });
}

function updateSummaryTotals() {
  if (!checkoutData) return;

  const subtotal = checkoutData.subtotal;
  const productDiscount = checkoutData.discount;
  const shipping = checkoutData.shippingCharge;
  const tax = checkoutData.tax;
  const total = Math.round(subtotal - productDiscount - couponDiscount + shipping + tax);
  const totalSaved = productDiscount + couponDiscount;

  document.getElementById('subtotalLabel').textContent = `Subtotal (${checkoutData.items.length} items)`;
  document.getElementById('summarySubtotal').textContent = `₹${subtotal.toLocaleString()}`;
  document.getElementById('summaryDiscount').textContent = `-₹${productDiscount.toLocaleString()}`;
  document.getElementById('summaryShipping').innerHTML = shipping === 0
    ? '<span class="text-success">Free</span>' : `₹${shipping}`;
  document.getElementById('summaryTax').textContent = `₹${tax.toLocaleString()}`;
  document.getElementById('summaryTotal').textContent = `₹${total.toLocaleString()}`;

  if (couponDiscount > 0) {
    document.getElementById('couponRow').classList.remove('d-none');
    document.getElementById('couponLabel').textContent = `Coupon (${appliedCoupon})`;
    document.getElementById('summaryCoupon').textContent = `-₹${couponDiscount.toLocaleString()}`;
  } else {
    document.getElementById('couponRow').classList.add('d-none');
  }

  if (totalSaved > 0) {
    document.getElementById('summarySaved').textContent = `You saved ₹${totalSaved.toLocaleString()} on this order`;
  }
}

// Payment method selection
document.querySelectorAll('.payment-option').forEach(option => {
  option.addEventListener('click', () => {
    document.querySelectorAll('.payment-option').forEach(o => {
      o.classList.remove('selected');
      o.querySelector('.payment-radio').classList.remove('selected');
    });
    option.classList.add('selected');
    option.querySelector('.payment-radio').classList.add('selected');
    selectedPayment = option.dataset.method;

    if (selectedPayment === 'Wallet') {
      showToast('Wallet feature coming soon', 'error');
    }
  });
});

// Coupon apply
document.getElementById('applyCouponBtn').addEventListener('click', async () => {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  const errorEl = document.getElementById('couponError');
  const successEl = document.getElementById('couponSuccess');

  errorEl.classList.add('d-none');
  successEl.classList.add('d-none');

  if (!code) {
    errorEl.textContent = 'Please enter a coupon code';
    errorEl.classList.remove('d-none');
    return;
  }

  // Simple demo coupons — replace with real DB lookup later
  const demoCoupons = {
    'WELCOME10': 1000,
    'SAVE500': 500,
    'FLAT200': 200
  };

  if (demoCoupons[code]) {
    couponDiscount = demoCoupons[code];
    appliedCoupon = code;
    document.getElementById('couponSuccessMsg').textContent =
      `Coupon applied! You saved ₹${couponDiscount.toLocaleString()}`;
    successEl.classList.remove('d-none');
    updateSummaryTotals();
    showToast(`Coupon ${code} applied successfully`);
  } else {
    errorEl.textContent = 'Invalid coupon code. Please try again.';
    errorEl.classList.remove('d-none');
  }
});

// Remove coupon
document.getElementById('removeCouponBtn').addEventListener('click', () => {
  couponDiscount = 0;
  appliedCoupon = '';
  document.getElementById('couponInput').value = '';
  document.getElementById('couponSuccess').classList.add('d-none');
  updateSummaryTotals();
  showToast('Coupon removed');
});

// Place Order
document.getElementById('placeOrderBtn').addEventListener('click', async () => {
  const addressId = sessionStorage.getItem('selectedAddressId');

  if (!addressId) {
    showToast('Please select a delivery address first', 'error');
    setTimeout(() => window.location.href = '/checkout/address', 1500);
    return;
  }

  if( selectedPayment === 'Wallet'){
    showToast('Wallet feature coming soon','error');
    return;
  }

  if( selectedPayment === 'COD'){
    await placeOrderCOD(addressId);
  }else if(selectedPayment === 'Online'){
    await placeOrderOnline(addressId);
  }
});

//----COD  flow (your existing logic,unchanged) ---
async function placeOrderCOD(addressId){
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Placing Order...';

  const res = await fetch('/api/users/orders/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addressId,
      paymentMethod: 'COD',
      couponDiscount,
      couponCode: appliedCoupon
    })
  });

  const data = await res.json();

  if (!res.ok) {
    showToast(data.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Place Order';
    return;
  }

  // Store order info for success page
  sessionStorage.setItem('lastOrderId', data.orderId);
  sessionStorage.setItem('lastOrderDbId', data.orderDbId);
  sessionStorage.removeItem('selectedAddressId');

  window.location.href = '/order-success';
}

//--- Online payment flow ----

async function placeOrderOnline(addressId){
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent='Opening payment.....';

  //Step A:ask our backend to create aRazorpay order
  const totalAmount=document.getElementById('summaryTotal').textContent.replace(/[₹,]/g,'');

  const razorRes =await fetch('/api/users/orders/create-razorpay-order',{
   method:'POST',
  headers:{ 'Content-Type':'application/json'},
  body: JSON.stringify({amount:totalAmount})
 });

 const razorData= await razorRes.json();

 console.log('Razorpay response from backend:', razorData);

 if(!razorRes.ok){
  showToast(razorData.message || 'could not start payment','error');
  btn.disabled=false;
  btn.textContent='Place Order';
  return;
 }

 //step B:Open Razorpay's popup

 const options={
  key:razorData.keyId,
  amount:razorData.amount,
  currency:razorData.currency,
  order_id:razorData.orderId,
  name:'ChronoLux',
  description:'Watch Purchase',
  handler:async function (response){
    //step c:payment succeeded in the popup-now verify + place order on OUR backend
    await confirmOnlineOrder(addressId,response);
  },
  modal:{
    ondismiss: function(){
      //user closed the popup without paying
      showToast('payment cancelled','error');
      btn.disabled=false;
      btn.textContent='Place Order';
    }
  },
  theme:{color:'#f5b800'}
 };

 const rzp=new Razorpay(options);

 rzp.on('payment.failed',function(response){
  showToast('payment failed: ' + response.error.description,'error');
  window.location.href='/payment-failed';
 });

 rzp.open();

 //Reset button text since popup is now handling the wait
 btn.disabled=false;
 btn.textContent='Place Order';
}

//----After successful Razorpay payment ,confirm with our backend---
async function confirmOnlineOrder(addressId,razorpayResponse){
const btn=document.getElementById('placeOrderBtn');
btn.disabled=true;
btn.textContent='Comfirming payment...';

const res=await fetch('/api/users/orders/place',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    addressId,
    paymentMethod:'Online',
    couponDiscount,
    couponCode:appliedCoupon,
    razorpayOrderId:razorpayResponse.razorpay_order_id,
    razorpayPaymentId:razorpayResponse.razorpay_payment_id,
    razorpaySignature:razorpayResponse.razorpay_signature
  })
});

const data=await res.json();

if(!res.ok){
  showToast(data.message,'error');
  btn.disabled=false;
  btn.textContent='Place Order';
  window.location.href='/payment-failed';
  return;
}

sessionStorage.setItem('lastOrderId',data.orderId);
sessionStorage.setItem('lastOrderDbId',data.orderDbId);
sessionStorage.removeItem('selectedAddressId');
window.location.href='/order-success';
}

loadPaymentData();