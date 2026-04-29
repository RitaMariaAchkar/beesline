const CART_STORAGE_KEY = "beesline_cart";
const SPIN_WHEEL_SEEN_KEY = "beesline_spin_wheel_seen";
const SPIN_WHEEL_REWARD_KEY = "beesline_spin_wheel_reward";

const spinWheelRewards = [
    "10% off your next order",
    "Free lip care with any purchase",
    "Buy 2, get 1 shower cream free",
    "15% off face care",
    "Free delivery on your next cart",
    "20% off bundles",
    "Free mini soap with orders over USD 20",
    "12% off hair care",
    "Gift wrap on your next order",
    "25% off one roll-on deodorant",
];

function getProductsCatalog() {
    return typeof products !== "undefined" && Array.isArray(products) ? products : [];
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const map = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        };

        return map[char];
    });
}

function getProductById(productId) {
    return getProductsCatalog().find((product) => Number(product.id) === Number(productId));
}

function getProductImageSrc(product) {
    return product && product.image ? `images/products/${product.image}` : "images/beesline_logo_bee.jpg";
}

function getFallbackProductImageSrc() {
    return "images/beesline_logo_bee.jpg";
}

function getProductFinalPrice(product) {
    if (!product) return 0;

    const discount = Number(product.discount) || 0;
    const price = Number(product.price) || 0;

    return discount > 0 ? price - price * (discount / 100) : price;
}

function formatCurrency(value) {
    return `USD ${Number(value || 0).toFixed(2)}`;
}

function getProductUrl(productId) {
    return `product.html?id=${encodeURIComponent(productId)}`;
}

function getProductTags(product) {
    if (!product) return [];
    return Array.isArray(product.tag) ? product.tag : [product.tag].filter(Boolean);
}

function readCart() {
    try {
        const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
        const cartArray = Array.isArray(savedCart) ? savedCart : [];

        return cartArray
            .map((item) => ({
                id: Number(item.id),
                quantity: Math.max(1, Number(item.quantity) || 1),
            }))
            .filter((item) => Number.isFinite(item.id));
    } catch (error) {
        return [];
    }
}

function writeCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartUI();
}

function getCartTotalQuantity(cart = readCart()) {
    return cart.reduce((total, item) => total + item.quantity, 0);
}

function addToCart(productId, quantity = 1) {
    const product = getProductById(productId);
    if (!product) return;

    const amount = Math.max(1, Number(quantity) || 1);
    const cart = readCart();
    const existingItem = cart.find((item) => item.id === Number(productId));

    if (existingItem) {
        existingItem.quantity += amount;
    } else {
        cart.push({ id: Number(productId), quantity: amount });
    }

    writeCart(cart);
}

function removeFromCart(productId) {
    writeCart(readCart().filter((item) => item.id !== Number(productId)));
}

function setCartQuantity(productId, quantity) {
    const amount = Number(quantity);

    if (!Number.isFinite(amount) || amount <= 0) {
        removeFromCart(productId);
        return;
    }

    const cart = readCart().map((item) =>
        item.id === Number(productId) ? { ...item, quantity: Math.max(1, amount) } : item,
    );

    writeCart(cart);
}

function getCartSummary(cart = readCart()) {
    return cart.reduce(
        (summary, item) => {
            const product = getProductById(item.id);
            const lineTotal = getProductFinalPrice(product) * item.quantity;

            return {
                count: summary.count + item.quantity,
                subtotal: summary.subtotal + lineTotal,
            };
        },
        { count: 0, subtotal: 0 },
    );
}

function createCartPopover(cartWrap) {
    if (cartWrap.querySelector(".cart-popover")) return;

    cartWrap.insertAdjacentHTML(
        "beforeend",
        `
            <div class="cart-popover" aria-label="Shopping cart" role="dialog">
                <div class="cart-popover-header">
                    <div>
                        <span class="cart-kicker">Shopping Cart</span>
                        <h3>Your Beesline Bag</h3>
                    </div>
                    <button class="cart-close" type="button" aria-label="Close cart">&times;</button>
                </div>
                <div class="cart-items"></div>
                <div class="cart-footer">
                    <div class="cart-total-row">
                        <span>Subtotal</span>
                        <strong class="cart-subtotal">USD 0.00</strong>
                    </div>
                    <button class="cart-checkout" type="button">Checkout</button>
                </div>
            </div>
        `,
    );
}

function renderCartPopover(cartWrap) {
    const cart = readCart();
    const itemsContainer = cartWrap.querySelector(".cart-items");
    const subtotal = cartWrap.querySelector(".cart-subtotal");
    const checkoutButton = cartWrap.querySelector(".cart-checkout");

    if (!itemsContainer || !subtotal || !checkoutButton) return;

    if (!cart.length) {
        itemsContainer.innerHTML = `
            <div class="cart-empty">
                <strong>Your cart is empty.</strong>
                <span>Add a product and it will stay saved here.</span>
            </div>
        `;
    } else {
        itemsContainer.innerHTML = cart
            .map((item) => {
                const product = getProductById(item.id);
                const name = product ? product.name : `Product #${item.id}`;
                const itemUrl = getProductUrl(item.id);
                const lineTotal = getProductFinalPrice(product) * item.quantity;

                return `
                    <div class="cart-item">
                        <a href="${itemUrl}" class="cart-item-image">
                            <img src="${getProductImageSrc(product)}" alt="${escapeHTML(name)}" />
                        </a>
                        <div class="cart-item-info">
                            <a href="${itemUrl}" class="cart-item-name">${escapeHTML(name)}</a>
                            <span class="cart-item-meta">${item.quantity} x ${formatCurrency(getProductFinalPrice(product))}</span>
                            <strong>${formatCurrency(lineTotal)}</strong>
                        </div>
                        <button class="cart-remove" type="button" data-remove-id="${item.id}" aria-label="Remove ${escapeHTML(name)}">&times;</button>
                    </div>
                `;
            })
            .join("");
    }

    const summary = getCartSummary(cart);
    subtotal.textContent = formatCurrency(summary.subtotal);
    checkoutButton.disabled = summary.count === 0;

    cartWrap.querySelectorAll("[data-remove-id]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            removeFromCart(button.dataset.removeId);
        });
    });
}

function closeCartPopups() {
    document.querySelectorAll(".cart-popover.open").forEach((popover) => {
        popover.classList.remove("open");
    });
}

function openCartPopup() {
    const cartWrap = document.querySelector(".cart-wrap");
    if (!cartWrap) return;

    closeCartPopups();
    cartWrap.querySelector(".cart-popover")?.classList.add("open");
    renderCartPopover(cartWrap);
}

function updateCartUI() {
    const cart = readCart();
    const totalQuantity = getCartTotalQuantity(cart);

    document.querySelectorAll(".cart-badge").forEach((badge) => {
        badge.textContent = totalQuantity;
        badge.classList.toggle("cart-badge-empty", totalQuantity === 0);
    });

    document.querySelectorAll(".cart-wrap").forEach((cartWrap) => {
        renderCartPopover(cartWrap);
    });
}

function initMobileNav() {
    document.querySelectorAll("header").forEach((header) => {
        const toggleButton = header.querySelector(".nav-toggle");
        const nav = header.querySelector("nav");

        if (!toggleButton || !nav) return;

        function closeNav() {
            header.classList.remove("nav-open");
            toggleButton.setAttribute("aria-expanded", "false");
        }

        toggleButton.addEventListener("click", (event) => {
            event.stopPropagation();

            const isOpen = header.classList.toggle("nav-open");
            toggleButton.setAttribute("aria-expanded", String(isOpen));
        });

        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", closeNav);
        });

        document.addEventListener("click", (event) => {
            if (!header.contains(event.target)) {
                closeNav();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeNav();
            }
        });
    });
}

function initCart() {
    document.querySelectorAll(".cart-wrap").forEach((cartWrap) => {
        createCartPopover(cartWrap);
        cartWrap.setAttribute("role", "button");
        cartWrap.setAttribute("tabindex", "0");
        cartWrap.setAttribute("aria-label", "Open shopping cart");

        cartWrap.addEventListener("click", (event) => {
            if (event.target.closest(".cart-popover")) return;

            const popover = cartWrap.querySelector(".cart-popover");
            const shouldOpen = !popover.classList.contains("open");

            closeCartPopups();
            popover.classList.toggle("open", shouldOpen);
            renderCartPopover(cartWrap);
        });

        cartWrap.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;

            event.preventDefault();
            cartWrap.click();
        });

        cartWrap.querySelector(".cart-close")?.addEventListener("click", (event) => {
            event.stopPropagation();
            closeCartPopups();
        });
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".cart-wrap")) {
            closeCartPopups();
        }
    });

    updateCartUI();
}

function createSpinWheelPopup() {
    if (localStorage.getItem(SPIN_WHEEL_SEEN_KEY) === "true") return;
    if (document.querySelector(".spin-wheel-overlay")) return;

    const rewardSegments = spinWheelRewards
        .map((reward, index) => {
            const angle = index * (360 / spinWheelRewards.length) + 18;

            return `
                <span style="--segment-angle: ${angle}deg;">
                    <em>${escapeHTML(reward)}</em>
                </span>
            `;
        })
        .join("");

    document.body.insertAdjacentHTML(
        "beforeend",
        `
            <div class="spin-wheel-overlay" role="dialog" aria-modal="true" aria-labelledby="spin-wheel-title">
                <div class="spin-wheel-modal">
                    <button class="spin-wheel-close" type="button" aria-label="Close spin wheel">&times;</button>
                    <div class="spin-wheel-copy">
                        <p class="product-eyebrow">First visit treat</p>
                        <h2 id="spin-wheel-title">Spin For A Bee-autiful Reward</h2>
                        <p>Try your luck and unlock a little placeholder gift for your next Beesline cart.</p>
                    </div>

                    <div class="spin-wheel-stage">
                        <div class="spin-wheel-pointer"></div>
                        <div class="spin-wheel" aria-hidden="true">
                            ${rewardSegments}
                            <div class="spin-wheel-center">BEE</div>
                        </div>
                    </div>

                    <div class="spin-wheel-actions">
                        <button class="btn-primary spin-wheel-button" type="button">Spin the Wheel</button>
                        <p class="spin-wheel-result" aria-live="polite"></p>
                    </div>
                </div>
            </div>
        `,
    );

    initSpinWheelBehavior();
}

function closeSpinWheelPopup() {
    const overlay = document.querySelector(".spin-wheel-overlay");

    localStorage.setItem(SPIN_WHEEL_SEEN_KEY, "true");
    overlay?.classList.add("spin-wheel-closing");

    window.setTimeout(() => {
        overlay?.remove();
    }, 220);
}

function launchSpinWheelConfetti(stage) {
    if (!stage?.isConnected) return;

    stage.querySelector(".spin-wheel-confetti")?.remove();

    const confettiLayer = document.createElement("div");
    const colors = ["#e8a820", "#4a7c3f", "#fff3cc", "#d99222", "#7a9a7b", "#ffffff"];

    confettiLayer.className = "spin-wheel-confetti";
    confettiLayer.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 54; index += 1) {
        const piece = document.createElement("i");
        const x = Math.round(Math.random() * 380 - 190);
        const y = Math.round(Math.random() * -250 - 36);
        const fall = Math.round(Math.random() * 140 + 50);
        const spin = Math.round(Math.random() * 620 - 310);
        const delay = Math.round(Math.random() * 180);

        piece.style.setProperty("--x", `${x}px`);
        piece.style.setProperty("--y", `${y}px`);
        piece.style.setProperty("--fall", `${fall}px`);
        piece.style.setProperty("--spin", `${spin}deg`);
        piece.style.setProperty("--delay", `${delay}ms`);
        piece.style.setProperty("--color", colors[index % colors.length]);

        if (index % 3 === 0) {
            piece.className = "is-round";
        }

        confettiLayer.appendChild(piece);
    }

    stage.appendChild(confettiLayer);

    window.setTimeout(() => {
        confettiLayer.remove();
    }, 1900);
}

function initSpinWheelBehavior() {
    const overlay = document.querySelector(".spin-wheel-overlay");
    const stage = document.querySelector(".spin-wheel-stage");
    const wheel = document.querySelector(".spin-wheel");
    const spinButton = document.querySelector(".spin-wheel-button");
    const result = document.querySelector(".spin-wheel-result");
    const closeButton = document.querySelector(".spin-wheel-close");

    if (!overlay || !stage || !wheel || !spinButton || !result || !closeButton) return;

    let hasSpun = false;

    closeButton.addEventListener("click", closeSpinWheelPopup);

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeSpinWheelPopup();
        }
    });

    spinButton.addEventListener("click", () => {
        if (hasSpun) return;

        hasSpun = true;
        spinButton.disabled = true;

        const selectedIndex = Math.floor(Math.random() * spinWheelRewards.length);
        const segmentSize = 360 / spinWheelRewards.length;
        const targetAngle = selectedIndex * segmentSize + segmentSize / 2;
        const fullSpins = 5 * 360;
        const finalRotation = fullSpins + (360 - targetAngle);
        const selectedReward = spinWheelRewards[selectedIndex];

        wheel.style.transform = `rotate(${finalRotation}deg)`;

        window.setTimeout(() => {
            localStorage.setItem(SPIN_WHEEL_SEEN_KEY, "true");
            localStorage.setItem(SPIN_WHEEL_REWARD_KEY, selectedReward);
            launchSpinWheelConfetti(stage);
            result.innerHTML = `You won: <strong>${escapeHTML(selectedReward)}</strong>`;
            spinButton.textContent = "Reward Saved";
        }, 4300);
    });
}

/**
 * Renders a list of products into a specific HTML container
 * @param {Array} productList - The array of product objects
 * @param {String} selector - The CSS selector for the grid (e.g., '.bundles-grid')
 */
function renderProducts(productList, selector) {
    const container = document.querySelector(selector);
    const safeProductList = Array.isArray(productList) ? productList : [];

    if (!container) return;

    container.innerHTML = "";

    if (!safeProductList.length) {
        container.innerHTML = `<div class="products-empty">No products found. Try another search.</div>`;
        return;
    }

    safeProductList.forEach((item) => {
        const hasDiscount = item.discount && item.discount > 0;
        const discountHTML = hasDiscount ? `<span class="save-badge">Save ${item.discount}%</span>` : "";
        const finalPrice = getProductFinalPrice(item);
        const oldPriceHTML = hasDiscount ? `<span class="price-old">${formatCurrency(item.price)}</span>` : "";
        const detailUrl = getProductUrl(item.id);

        container.insertAdjacentHTML(
            "beforeend",
            `
                <article class="bundle-card product-card-link" data-product-id="${item.id}" tabindex="0">
                    ${discountHTML}
                    <img class="bundle-img" src="${getProductImageSrc(item)}" alt="${escapeHTML(item.name)}" loading="lazy" onerror="this.onerror=null;this.src='${getFallbackProductImageSrc()}';" />
                    <div class="bundle-info">
                        <h3 title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</h3>
                        <p>${escapeHTML(item.desc)}</p>
                        <div class="bundle-price">
                            <span class="price-new">${formatCurrency(finalPrice)}</span>
                            ${oldPriceHTML}
                        </div>
                        <a href="${detailUrl}" class="btn-shop" aria-label="View ${escapeHTML(item.name)}">View Product &rarr;</a>
                    </div>
                </article>
            `,
        );
    });

    container.querySelectorAll(".product-card-link").forEach((card) => {
        const productUrl = getProductUrl(card.dataset.productId);

        card.addEventListener("click", (event) => {
            if (event.target.closest("a, button")) return;
            window.location.href = productUrl;
        });

        card.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;

            event.preventDefault();
            window.location.href = productUrl;
        });
    });
}

window.BeeslineCart = {
    add: addToCart,
    get: readCart,
    remove: removeFromCart,
    setQuantity: setCartQuantity,
    open: openCartPopup,
    update: updateCartUI,
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initMobileNav();
        initCart();
        createSpinWheelPopup();
    });
} else {
    initMobileNav();
    initCart();
    createSpinWheelPopup();
}
