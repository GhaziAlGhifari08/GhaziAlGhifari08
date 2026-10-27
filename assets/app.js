(() => {
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const toast = (msg) => { const t=$('#toast'); if(!t)return; t.textContent=msg;t.classList.add('show');clearTimeout(window._toastTimer);window._toastTimer=setTimeout(()=>t.classList.remove('show'),2600); };
const toggle = $('#menuToggle'), sidebar=$('#sidebar');
if(toggle && sidebar) toggle.addEventListener('click',()=>sidebar.classList.toggle('open'));
const search=$('#tableSearch'), table=$('#catalogTable');
if(search&&table) search.addEventListener('input',()=>$$('tbody tr',table).forEach(tr=>tr.classList.toggle('hidden',!tr.innerText.toLowerCase().includes(search.value.toLowerCase()))));
const add=$('#addItem'), itemModal=$('#itemModal');
if(add&&itemModal)add.addEventListener('click',()=>itemModal.classList.add('show'));
const closeItem=$('#closeItemModal');if(closeItem&&itemModal)closeItem.addEventListener('click',()=>itemModal.classList.remove('show'));
if(itemModal)itemModal.addEventListener('click',e=>{if(e.target===itemModal)itemModal.classList.remove('show')});
const itemForm=$('#itemForm');if(itemForm)itemForm.addEventListener('submit',e=>{e.preventDefault();itemModal.classList.remove('show');toast('Form demo berhasil divalidasi. Hubungkan ke database untuk menyimpan.');itemForm.reset()});
const saveSettings=$('#saveSettings');if(saveSettings)saveSettings.addEventListener('click',()=>toast('Pengaturan demo belum tersimpan ke database.'));
const applyFilter=$('#applyFilter');if(applyFilter)applyFilter.addEventListener('click',()=>toast('Filter UI diterapkan. Sambungkan ke query laporan untuk data aktual.'));
const exportBtn=$('#exportCsv');if(exportBtn)exportBtn.addEventListener('click',()=>{const t=$('#reportTable');if(!t)return;const rows=$$('tr',t).map(tr=>$$('th,td',tr).map(td=>'"'+td.innerText.replace(/"/g,'""').trim()+'"').join(','));const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='laporan-penjualan-demo.csv';a.click();URL.revokeObjectURL(a.href);toast('File CSV demo berhasil dibuat.')});
const cart={};let orderType='Dine-In',paymentMethod='Tunai';
const rupiah=n=>'Rp '+Math.max(0,Math.round(n)).toLocaleString('id-ID');
const products=$$('.pos-product');
function filtered(){const q=($('#productSearch')?.value||'').toLowerCase();const cat=$('.chip.active')?.dataset.cat||'all';products.forEach(p=>p.classList.toggle('hidden',!p.dataset.name.toLowerCase().includes(q)||(cat!=='all'&&p.dataset.cat!==cat)))}
products.forEach(p=>p.addEventListener('click',()=>{const id=p.dataset.id;if(!cart[id])cart[id]={id:Number(id),name:p.dataset.name,price:Number(p.dataset.price),qty:0};if(cart[id].qty>=Number(p.dataset.stock)){toast('Stok '+p.dataset.name+' hanya '+p.dataset.stock+'.');return}cart[id].qty++;renderCart()}));
$$('.chip').forEach(c=>c.addEventListener('click',()=>{$$('.chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');filtered()}));
const ps=$('#productSearch');if(ps)ps.addEventListener('input',filtered);
function subtotal(){return Object.values(cart).reduce((s,x)=>s+x.price*x.qty,0)}
function totals(){const sub=subtotal(),discount=Math.min(sub,Math.max(0,Number($('#discount')?.value||0))),tax=Math.round(Math.max(0,sub-discount)*.10);return{sub,discount,tax,total:Math.max(0,sub-discount+tax)}}
function renderCart(){const list=$('#cartList');if(!list)return;const items=Object.values(cart).filter(x=>x.qty>0);$('#cartCount').textContent=items.reduce((s,x)=>s+x.qty,0)+' item dipilih';if(!items.length){list.innerHTML='<div class="empty-cart"><span>＋</span><b>Belum ada menu</b><p>Pilih menu di sebelah kiri untuk memulai pesanan.</p></div>'}else{list.innerHTML=items.map(x=>`<div class="cart-item"><div class="cart-item-info"><b>${escapeHtml(x.name)}</b><small>${rupiah(x.price)} / item</small></div><div class="qty-control"><button data-action="minus" data-name="${escapeHtml(x.name)}">−</button><span>${x.qty}</span><button data-action="plus" data-name="${escapeHtml(x.name)}">+</button></div><div class="cart-item-price">${rupiah(x.price*x.qty)}</div></div>`).join('')}list.onclick=e=>{const b=e.target.closest('button[data-action]');if(!b)return;const x=cart[b.dataset.id];if(!x)return;const stock=Number($(`.pos-product[data-id="${x.id}"]`)?.dataset.stock??Infinity);if(b.dataset.action==='plus'&&x.qty>=stock){toast('Stok '+x.name+' hanya '+stock+'.');return}x.qty+=b.dataset.action==='plus'?1:-1;if(x.qty<=0)delete cart[b.dataset.id];renderCart()};updateBill()}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function updateBill(){const t=totals();if($('#subtotal'))$('#subtotal').textContent=rupiah(t.sub);if($('#tax'))$('#tax').textContent=rupiah(t.tax);if($('#grandTotal'))$('#grandTotal').textContent=rupiah(t.total);if($('#modalTotal'))$('#modalTotal').textContent=rupiah(t.total);updateChange()}
const disc=$('#discount');if(disc)disc.addEventListener('input',updateBill);
const clear=$('#clearCart');if(clear)clear.addEventListener('click',()=>{Object.keys(cart).forEach(k=>delete cart[k]);renderCart()});
$$('.type-btn').forEach(b=>b.addEventListener('click',()=>{orderType=b.dataset.type;$$('.type-btn').forEach(x=>x.classList.toggle('active',x===b));if($('#tableField'))$('#tableField').classList.toggle('hidden',orderType==='Takeaway')}));
const modal=$('#paymentModal'), checkout=$('#checkoutBtn');if(checkout)checkout.addEventListener('click',()=>{if(!Object.keys(cart).length){toast('Pilih setidaknya satu menu terlebih dahulu.');return}if(orderType==='Dine-In'&&!$('#tableNumber').value){toast('Pilih nomor meja untuk pesanan Dine-In.');$('#tableNumber').focus();return}updateBill();modal.classList.add('show')});
const closeModal=$('#closeModal');if(closeModal)closeModal.addEventListener('click',()=>modal.classList.remove('show'));if(modal)modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
$$('.payment-option').forEach(b=>b.addEventListener('click',()=>{paymentMethod=b.dataset.method;$$('.payment-option').forEach(x=>x.classList.toggle('active',x===b));if($('#cashField'))$('#cashField').classList.toggle('hidden',paymentMethod!=='Tunai');updateChange()}));
function updateChange(){const cash=Number($('#cashReceived')?.value||0),total=totals().total;if($('#changeAmount'))$('#changeAmount').textContent=rupiah(paymentMethod==='Tunai'?Math.max(0,cash-total):0)}
const cash=$('#cashReceived');if(cash)cash.addEventListener('input',updateChange);
const confirm=$('#confirmPayment');if(confirm)confirm.addEventListener('click',async()=>{const t=totals();if(paymentMethod==='Tunai'&&Number($('#cashReceived').value||0)<t.total){toast('Uang diterima belum mencukupi.');return}
const w=window.open('','_blank','width=420,height=650');confirm.disabled=true;
try{const res=await fetch('api/checkout.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':document.querySelector('meta[name="csrf-token"]')?.content||''},body:JSON.stringify({type:orderType,table:orderType==='Dine-In'?$('#tableNumber').value:'',customer:$('#customerName').value,note:$('#orderNote').value,discount:t.discount,method:paymentMethod,cash:Number($('#cashReceived')?.value||0),items:Object.values(cart).map(x=>({id:x.id,qty:x.qty}))})});
const data=await res.json().catch(()=>({ok:false,message:'Respons server tidak valid.'}));
if(!res.ok||!data.ok){if(w)w.close();toast(data.message||'Transaksi gagal disimpan.');return}
modal.classList.remove('show');
const receipt=`${data.invoice}\nTitik Temu Kopi\n${data.created_at} · Kasir: ${data.cashier}\n${orderType}${orderType==='Dine-In'?' · '+$('#tableNumber').value:''}\n${data.items.map(x=>`${x.name} x${x.qty} = ${rupiah(x.sub)}`).join('\n')}\nSubtotal: ${rupiah(data.subtotal)}\nDiskon: ${rupiah(data.discount)}\nPajak 10%: ${rupiah(data.tax)}\nTOTAL: ${rupiah(data.total)}\nPembayaran: ${paymentMethod}\nDibayar: ${rupiah(data.paid)}\nKembali: ${rupiah(data.change)}\nNama: ${$('#customerName').value||'-'}\nCatatan: ${$('#orderNote').value||'-'}\n\nTerima kasih ☕`;
if(w){w.document.write('<pre style="font:13px monospace;white-space:pre-wrap;padding:20px">'+escapeHtml(receipt)+'</pre>');w.document.close();w.print()}
data.items.forEach(x=>{const el=$(`.pos-product[data-id="${x.id}"]`);if(el){el.dataset.stock=x.stock_left;const sp=$('.menu-meta span',el);if(sp)sp.textContent=sp.textContent.replace(/stok \d+/,'stok '+x.stock_left);if(x.stock_left<=0)el.disabled=true}});
toast('Transaksi '+data.invoice+' tersimpan. Kembalian '+rupiah(data.change)+'.');
Object.keys(cart).forEach(k=>delete cart[k]);renderCart();if($('#cashReceived'))$('#cashReceived').value='';if($('#discount'))$('#discount').value='0';if($('#customerName'))$('#customerName').value='';if($('#orderNote'))$('#orderNote').value='';if($('#tableNumber'))$('#tableNumber').value=''}
catch(err){if(w)w.close();toast('Gagal terhubung ke server.')}finally{confirm.disabled=false}});
})();