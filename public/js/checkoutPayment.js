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
  });
});

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

  // Prevent multiple coupon applications — one at a time
  if (appliedCoupon) {
    errorEl.textContent = 'A coupon is already applied. Remove it first to apply a different one.';
    errorEl.classList.remove('d-none');
    return;
  }

  if (!checkoutData) {
    errorEl.textContent = 'Order data not loaded yet, please wait';
    errorEl.classList.remove('d-none');
    return;
  }

  const orderAmount = checkoutData.subtotal - checkoutData.discount;

  const res = await fetch('/api/users/coupons/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, orderAmount })
  });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.message;
    errorEl.classList.remove('d-none');
    return;
  }

  couponDiscount = data.discountAmount;
  appliedCoupon = data.couponCode;
  document.getElementById('couponSuccessMsg').textContent = data.message;
  successEl.classList.remove('d-none');
  document.getElementById('couponInput').disabled = true;   // prevent typing another while one is active
  document.getElementById('applyCouponBtn').disabled = true;
  updateSummaryTotals();
  showToast(data.message);
});

// Remove coupon
document.getElementById('removeCouponBtn').addEventListener('click', () => {
  couponDiscount = 0;
  appliedCoupon = '';
  document.getElementById('couponInput').value = '';
  document.getElementById('couponInput').disabled = false;
  document.getElementById('applyCouponBtn').disabled = false;
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


  if (selectedPayment === 'Wallet') {
  await placeOrderWallet(addressId);
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

async function placeOrderWallet(addressId) {
  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.textContent = 'Processing payment...';

  const res = await fetch('/api/users/orders/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      addressId,
      paymentMethod: 'Wallet',
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

 rzp.on('payment.failed', async function(response){
  await fetch('/api/users/orders/record-failed-payment', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ addressId, couponDiscount, couponCode: appliedCoupon })
  });
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

async function loadAvailableCoupons() {
  const res = await fetch('/api/users/coupons');
  if (!res.ok) return;
  const data = await res.json();

  const container = document.getElementById('availableCouponsList');
  if (!data.coupons || data.coupons.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `<p class="text-secondary small mb-2">Available coupons:</p>` +
    data.coupons.map(c => `
      <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2" style="border-color:#333 !important;">
        <div>
          <span class="fw-bold text-warning">${c.code}</span>
          <span class="text-secondary small ms-2">
            ${c.discountType === 'percentage' ? c.discountValue + '% off' : '₹' + c.discountValue + ' off'}
            (min order ₹${c.minOrderAmount.toLocaleString()})
          </span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-warning use-coupon-btn" data-code="${c.code}">Use</button>
      </div>`).join('');

  document.querySelectorAll('.use-coupon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('couponInput').value = btn.dataset.code;
    });
  });
}

async function loadWalletBalance() {
  const res = await fetch('/api/users/wallet');
  if (!res.ok) return;
  const data = await res.json();
  document.querySelector('#walletOption .text-success').textContent =
    `Available balance: ₹${data.balance.toLocaleString()}`;
}

loadPaymentData();
loadWalletBalance();
loadAvailableCoupons();
