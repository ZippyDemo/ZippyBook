// Delivery option selection
const deliveryCards = document.querySelectorAll('.delivery-type-card');
const deliveryAddressSection = document.getElementById('deliveryAddressSection');
const savedAddressSelect = document.getElementById('savedAddressSelect');

deliveryCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove selected class from all cards
        deliveryCards.forEach(c => c.classList.remove('selected'));
        // Add selected class to clicked card
        card.classList.add('selected');
        
        // Show/hide address section based on delivery type
        if (card.dataset.type === 'pickup') {
            deliveryAddressSection.style.display = 'none';
        } else {
            deliveryAddressSection.style.display = 'block';
        }
        
        // Update total price with delivery fee
        updateTotalWithDelivery(card.querySelector('.delivery-fee').textContent);
    });
});

// Load saved addresses
function loadSavedAddresses() {
    const addresses = JSON.parse(localStorage.getItem('savedAddresses') || '[]');
    savedAddressSelect.innerHTML = '<option value="">Select saved address</option>';
    addresses.forEach(address => {
        const option = document.createElement('option');
        option.value = address.id;
        option.textContent = address.name;
        savedAddressSelect.appendChild(option);
    });
}

// Update total price with delivery fee
function updateTotalWithDelivery(deliveryFee) {
    const fee = deliveryFee === 'Free' ? 0 : parseFloat(deliveryFee.replace('$', ''));
    // Add delivery fee to total
    calculateTotal(fee);
}