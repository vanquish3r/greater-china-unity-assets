document.addEventListener('DOMContentLoaded', () => {
    const assetGrid = document.getElementById('assetGrid');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sortSelect');
    const resultsInfo = document.getElementById('resultsInfo');

    let allAssets = [];

    // Observer for fade-in animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.1
    });
    let currentFilter = 'all'; // 'all', 'free', 'paid'
    let currentSort = 'default';
    let currentSearch = '';

    // Fetch data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allAssets = data.map(asset => {
                let parsedPrice = 0;
                let isUnknown = false;
                if (asset.IsFree || asset.Price === 'Free' || asset.Price === 'free') {
                    parsedPrice = 0;
                } else if (!asset.Price || asset.Price === 'Unknown' || asset.Price === 'unknown') {
                    parsedPrice = -1;
                    isUnknown = true;
                } else {
                    const match = String(asset.Price).match(/[\d.]+/);
                    parsedPrice = match ? parseFloat(match[0]) : 0;
                }

                return {
                    ...asset,
                    parsedPrice,
                    isUnknown,
                    lowerName: asset.Asset.toLowerCase(),
                    lowerPublisher: asset.Publisher.toLowerCase()
                };
            });
            renderAssets();
        })
        .catch(err => {
            resultsInfo.innerHTML = '<span style="color: var(--accent-secondary)">Failed to load assets. Please ensure data.json exists.</span>';
            console.error('Error fetching data:', err);
        });

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderAssets();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderAssets();
        });
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderAssets();
    });

    function renderAssets() {
        // Filter logic
        const filtered = allAssets.filter(asset => {
            // Apply search
            if (currentSearch && !asset.lowerName.includes(currentSearch) && !asset.lowerPublisher.includes(currentSearch)) {
                return false;
            }

            // Apply category filter
            if (currentFilter === 'Free' && !asset.IsFree) return false;
            if (currentFilter === 'Paid' && (asset.IsFree || asset.isUnknown)) return false;
            if (currentFilter === 'Unknown' && !asset.isUnknown) return false;

            return true;
        });

        // Sort logic
        if (currentSort !== 'default') {
            filtered.sort((a, b) => {
                if (currentSort === 'name-asc') {
                    return a.lowerName.localeCompare(b.lowerName);
                } else if (currentSort === 'price-asc' || currentSort === 'price-desc') {
                    const priceA = a.parsedPrice;
                    const priceB = b.parsedPrice;

                    // Keep unknowns at the bottom always for UX
                    if (priceA === -1 && priceB !== -1) return 1;
                    if (priceB === -1 && priceA !== -1) return -1;
                    if (priceA === -1 && priceB === -1) return 0;

                    return currentSort === 'price-asc' ? priceA - priceB : priceB - priceA;
                }
                return 0;
            });
        }

        // Update Info
        resultsInfo.textContent = `Showing ${filtered.length} asset${filtered.length !== 1 ? 's' : ''}`;

        // Render Cards
        assetGrid.innerHTML = '';

        if (filtered.length === 0) {
            assetGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <h3>No assets found matching your criteria.</h3>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach((asset, index) => {
            const isFree = asset.IsFree || asset.Price === 'Free';
            const priceClass = isFree ? 'asset-price free' : 'asset-price';
            const displayPrice = isFree ? 'Free' : (asset.Price || 'Unknown');

            const imageSrc = asset.ImageURL || 'https://via.placeholder.com/400x200/2a2a35/9ea3b5?text=No+Image';
            const storeUrl = asset.AssetURL || `https://assetstore.unity.com/?q=${encodeURIComponent(asset.Asset)}&orderBy=1`;

            html += `
                <div class="asset-card">
                    <div class="asset-image">
                        <img src="${imageSrc}" alt="${asset.Asset}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x200/2a2a35/9ea3b5?text=No+Image'" />
                    </div>
                    <div class="asset-content">
                        <h3 class="asset-title">${asset.Asset}</h3>
                        <div class="asset-publisher">
                            <svg class="publisher-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            ${asset.Publisher}
                        </div>
                        <div class="asset-footer">
                            <span class="${priceClass}">${displayPrice}</span>
                            <a href="${storeUrl}" target="_blank" class="store-btn">Open in<br>Unity Asset Store</a>
                        </div>
                    </div>
                </div>
            `;
        });
        assetGrid.innerHTML = html;

        // Observe newly rendered cards
        document.querySelectorAll('.asset-card').forEach(card => observer.observe(card));
    }

    // Back to Top functionality
    const backToTopBtn = document.getElementById('backToTopBtn');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});
