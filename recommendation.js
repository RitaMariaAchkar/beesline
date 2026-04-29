/**
 * BEESLINE AI RECOMMENDATION ENGINE - DYNAMIC MATCH VERSION
 */

let currentMode = "";

/**
 * Navigation: Validation and Branching
 */
function startQuiz(mode) {
    const age = document.getElementById("user-age").value;
    const gender = document.getElementById("user-gender").value;

    if (!age || age < 1 || age > 100) {
        alert("Please enter a valid age.");
        return;
    }
    if (gender === "unisex") {
        alert("Please select a gender.");
        return;
    }

    currentMode = mode;
    document.getElementById("step-0").style.display = "none";
    document.getElementById("form-controls").style.display = "flex";

    if (mode === "skin") {
        document.getElementById("skin-questions").style.display = "block";
        document.getElementById("hair-questions").style.display = "none";
    } else {
        document.getElementById("hair-questions").style.display = "block";
        document.getElementById("skin-questions").style.display = "none";
    }
}

/**
 * Core Logic: Weighted Scoring & Dynamic Match Calculation
 */
document.getElementById("recommendation-form").addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const selectedTags = formData.getAll("tags");
    const age = parseInt(document.getElementById("user-age").value);
    const gender = document.getElementById("user-gender").value;

    if (selectedTags.length === 0) {
        alert("Please select at least one concern.");
        return;
    }

    let scoredProducts = products.map((product) => {
        let score = 0;
        let matches = 0;
        const productTags = Array.isArray(product.tag) ? product.tag : [product.tag];

        // 1. CATEGORY LOCK
        if (product.category !== currentMode && product.category !== "bundle") {
            score -= 1000;
        }

        // 2. TAG MATCHING (Primary)
        selectedTags.forEach((userTag) => {
            if (productTags.includes(userTag)) {
                score += 20;
                matches++; // Track actual matches for percentage
            }
        });

        // 3. GENDER BIAS
        const isMensProduct = product.name.toLowerCase().includes("his") || productTags.includes("mens");
        if (gender === "male" && isMensProduct) score += 50;
        if (gender === "female" && isMensProduct) score -= 100;

        // 4. AGE LOGIC
        if (age >= 35 && productTags.some((t) => ["wrinkles", "spots", "firmness"].includes(t))) score += 15;
        if (age <= 22 && productTags.some((t) => ["acne", "oiliness"].includes(t))) score += 15;

        // 5. TIE-BREAKER (Randomness to prevent always picking the first product)
        score += Math.random();

        // --- DYNAMIC MATCH CALCULATION ---
        // Match % = (Matches / Total Selected) * 100
        // We cap it between 70% and 99% to look realistic
        let matchPercent = Math.round((matches / selectedTags.length) * 100);
        if (matchPercent > 99) matchPercent = 99;
        if (matchPercent < 60 && matches > 0) matchPercent = 75; // Marketing floor

        return { ...product, finalScore: score, matchRate: matchPercent };
    });

    scoredProducts.sort((a, b) => b.finalScore - a.finalScore);
    displayFinalResult(scoredProducts[0]);
});

/**
 * UI Rendering: Now uses product.matchRate instead of a hardcoded 98
 */
function displayFinalResult(product) {
    const resultArea = document.getElementById("results");
    document.getElementById("recommendation-form").style.display = "none";
    document.getElementById("form-controls").style.display = "none";

    resultArea.style.display = "block";

    const hasDiscount = product.discount > 0;
    const finalPrice = hasDiscount
        ? (product.price * (1 - product.discount / 100)).toFixed(2)
        : product.price.toFixed(2);

    resultArea.innerHTML = `
        <div class="text-center mb-5">
            <h2 class="display-6 fw-bold">Your AI <span style="color: var(--gold);">Selection</span></h2>
            <p class="text-muted">Our algorithm found the best match for your specific concerns.</p>
        </div>

        <div class="card border-0 shadow-lg overflow-hidden mx-auto" style="max-width: 650px; border-radius: 20px;">
            <div class="row g-0 align-items-center">
                <div class="col-md-5 d-flex align-items-center justify-content-center p-4 position-relative" style="min-height: 250px;">
                    <img src="images/products/${product.image}" 
                         class="img-fluid rounded" 
                         alt="${product.name}" 
                         style="max-height: 200px; object-fit: contain;"
                         onerror="this.src='https://via.placeholder.com/250x250?text=Beesline'">
                    ${hasDiscount ? `<span class="badge bg-danger position-absolute top-0 start-0 m-3 shadow-sm">Save ${product.discount}%</span>` : ""}
                </div>
                
                <div class="col-md-7">
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-2">
                            <span class="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle fw-bold" style="font-size: 0.75rem;">
                                ✨ ${product.matchRate}% MATCH
                            </span>
                        </div>
                        
                        <h3 class="card-title h4 mb-2 fw-bold">${product.name}</h3>
                        <p class="card-text text-muted small mb-3">${product.desc}</p>
                        
                        <div class="d-flex align-items-baseline gap-2 mb-4">
                            <span class="h3 fw-bold mb-0" style="color: var(--dark);">$${finalPrice}</span>
                            ${hasDiscount ? `<span class="text-decoration-line-through text-muted small">$${product.price.toFixed(2)}</span>` : ""}
                        </div>
                        
                        <div class="d-grid gap-2">
                            <button onclick="addToCart(${product.id}, 1); openCartPopup();" class="btn btn-warning fw-bold text-white py-2 shadow-sm" style="background-color: var(--gold); border: none;">
                                Add to Cart
                            </button>
                            <a href="product.html?id=${product.id}" class="btn btn-link btn-sm text-decoration-none fw-bold" style="color: var(--gold-dark);">
                                View Product Details
                            </a>
                            <button onclick="location.reload()" class="btn btn-link btn-sm text-decoration-none text-muted">
                                Not what you wanted? Try again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
