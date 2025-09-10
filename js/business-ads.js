class BusinessAdsManager {
    constructor() {
        this.currentSlide = 0;
        this.ads = [];
        this.initializeElements();
        this.bindEvents();
        this.loadAds();
    }

    initializeElements() {
        this.carousel = document.querySelector('.ads-carousel');
        this.wrapper = this.carousel.querySelector('.ads-wrapper');
        this.template = document.getElementById('business-ad-template');
        this.prevBtn = this.carousel.querySelector('.carousel-btn.prev');
        this.nextBtn = this.carousel.querySelector('.carousel-btn.next');
        this.indicators = this.carousel.querySelector('.carousel-indicators');
    }

    bindEvents() {
        this.prevBtn.addEventListener('click', () => this.previousSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
    }

    async loadAds() {
        try {
            // In a real app, this would be an API call
            this.ads = await this.fetchAds();
            this.renderAds();
            this.startAutoSlide();
        } catch (error) {
            console.error('Error loading ads:', error);
        }
    }

    renderAds() {
        this.wrapper.innerHTML = '';
        this.indicators.innerHTML = '';

        this.ads.forEach((ad, index) => {
            const slide = this.createAdSlide(ad);
            this.wrapper.appendChild(slide);

            const indicator = this.createIndicator(index);
            this.indicators.appendChild(indicator);
        });

        this.updateSlidePosition();
    }

    createAdSlide(ad) {
        const clone = this.template.content.cloneNode(true);
        
        const image = clone.querySelector('.ad-image');
        image.src = ad.image;
        image.alt = ad.businessName;

        clone.querySelector('.business-name').textContent = ad.businessName;
        clone.querySelector('.business-description').textContent = ad.description;
        clone.querySelector('.rating-value').textContent = ad.rating;
        clone.querySelector('.business-category').textContent = ad.category;

        return clone;
    }

    createIndicator(index) {
        const indicator = document.createElement('button');
        indicator.classList.add('indicator');
        if (index === this.currentSlide) indicator.classList.add('active');
        indicator.addEventListener('click', () => this.goToSlide(index));
        return indicator;
    }

    updateSlidePosition() {
        const offset = -this.currentSlide * 100;
        this.wrapper.style.transform = `translateX(${offset}%)`;
        
        this.indicators.querySelectorAll('.indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentSlide);
        });
    }

    previousSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.ads.length) % this.ads.length;
        this.updateSlidePosition();
    }

    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.ads.length;
        this.updateSlidePosition();
    }

    startAutoSlide() {
        setInterval(() => this.nextSlide(), 5000);
    }

    // Mock API call
    async fetchAds() {
        return [
            {
                businessName: "Italian Delight",
                description: "Authentic Italian cuisine with 20% off for first-time customers",
                image: "images/restaurant-1.jpg",
                rating: "4.8",
                category: "Restaurant"
            },
            // Add more mock ads here
        ];
    }
}

export default BusinessAdsManager;
