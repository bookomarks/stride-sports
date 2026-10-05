/* ============================================================
   STRIDE Sports Co. — data.js
   Single source of truth for the storefront:
   shipping config, US states, promo codes, tax rates, product
   catalog (6 products with full data, reviews, images), and
   homepage content. All other scripts read from window.STRIDE_DATA.
   ============================================================ */
window.STRIDE_DATA = (function () {
  'use strict';

  /* ----------------------------------------------------------
     Shipping & commerce configuration
     ---------------------------------------------------------- */
  var CONFIG = {
    currency: 'USD',
    freeShipThreshold: 75,          // free shipping when (subtotal - discount) >= 75
    defaultShipRate: 6.99,          // flat rate when state unknown
    defaultShipDays: [3, 6],        // base business-days range before state modifier
    taxRates: { CA: 0.08, MT: 0 },  // documented estimates; default below
    defaultTaxRate: 0.06,
    promoCodes: {
      SPORT10: { type: 'percent', value: 10, label: '10% off your order' }
    }
  };

  /* US States + DC: [code, name, flat ship rate, extra min days, extra max days] */
  var STATE_ROWS = [
    ['AL', 'Alabama',        7.99, 2, 4],
    ['AK', 'Alaska',        14.99, 4, 7],
    ['AZ', 'Arizona',        8.99, 2, 4],
    ['AR', 'Arkansas',       7.99, 2, 4],
    ['CA', 'California',     8.99, 1, 3],
    ['CO', 'Colorado',       8.49, 2, 4],
    ['CT', 'Connecticut',    8.49, 2, 4],
    ['DE', 'Delaware',       7.99, 2, 4],
    ['DC', 'District of Columbia', 7.99, 2, 4],
    ['FL', 'Florida',        8.49, 2, 4],
    ['GA', 'Georgia',        7.99, 2, 3],
    ['HI', 'Hawaii',        14.99, 4, 7],
    ['ID', 'Idaho',          8.99, 2, 5],
    ['IL', 'Illinois',       7.99, 1, 3],
    ['IN', 'Indiana',        7.99, 1, 3],
    ['IA', 'Iowa',           7.99, 2, 4],
    ['KS', 'Kansas',         7.99, 2, 4],
    ['KY', 'Kentucky',       7.99, 2, 4],
    ['LA', 'Louisiana',      7.99, 2, 4],
    ['ME', 'Maine',          8.49, 2, 5],
    ['MD', 'Maryland',       7.99, 2, 4],
    ['MA', 'Massachusetts',  8.49, 1, 3],
    ['MI', 'Michigan',       7.99, 1, 3],
    ['MN', 'Minnesota',      7.99, 2, 4],
    ['MS', 'Mississippi',    7.99, 2, 4],
    ['MO', 'Missouri',       7.99, 2, 4],
    ['MT', 'Montana',        6.99, 2, 5],
    ['NE', 'Nebraska',       7.99, 2, 4],
    ['NV', 'Nevada',         8.99, 2, 4],
    ['NH', 'New Hampshire',  8.49, 2, 4],
    ['NJ', 'New Jersey',     8.49, 1, 3],
    ['NM', 'New Mexico',     8.49, 2, 5],
    ['NY', 'New York',       8.99, 1, 3],
    ['NC', 'North Carolina', 7.99, 2, 4],
    ['ND', 'North Dakota',   7.99, 2, 5],
    ['OH', 'Ohio',           7.99, 1, 3],
    ['OK', 'Oklahoma',       7.99, 2, 4],
    ['OR', 'Oregon',         8.49, 2, 4],
    ['PA', 'Pennsylvania',   8.49, 1, 3],
    ['RI', 'Rhode Island',   8.49, 2, 4],
    ['SC', 'South Carolina', 7.99, 2, 4],
    ['SD', 'South Dakota',   7.99, 2, 5],
    ['TN', 'Tennessee',      7.99, 2, 3],
    ['TX', 'Texas',          7.99, 2, 4],
    ['UT', 'Utah',           8.99, 2, 4],
    ['VT', 'Vermont',        8.49, 2, 5],
    ['VA', 'Virginia',       7.99, 1, 3],
    ['WA', 'Washington',     8.99, 2, 4],
    ['WV', 'West Virginia',  7.99, 2, 4],
    ['WI', 'Wisconsin',      7.99, 2, 4],
    ['WY', 'Wyoming',        7.99, 2, 5]
  ];

  var US_STATES = STATE_ROWS.map(function (r) {
    return { code: r[0], name: r[1], rate: r[2], minDays: r[3], maxDays: r[4] };
  });

  /* Shortcut for image URLs — all images come from picsum.photos with
     fixed unique seeds so no image repeats within or across products. */
  function img(seed, w, h) {
    return 'https://picsum.photos/seed/' + seed + '/' + (w || 800) + '/' + (h || 800);
  }

  /* ----------------------------------------------------------
     PRODUCT CATALOG
     ---------------------------------------------------------- */
  var products = [

    /* ============ 1. RUNNING SHOES ============ */
    {
      id: 'p1',
      slug: 'apex-runner-pro',
      name: 'Apex Runner Pro',
      brand: 'StrideLab',
      category: 'Running',
      shortDescription: 'Feather-light daily trainer with responsive ApexFoam+ cushioning and a breathable engineered-mesh upper that keeps its snap after 400 miles.',
      fullDescription: [
        'The Apex Runner Pro is the shoe we always wished existed: a genuine daily trainer that feels like a race-day shoe. At just 8.6 oz (US 9), the full-length ApexFoam+ midsole returns energy on every stride while absorbing the impact of pavement miles. An 8 mm drop encourages a natural, midfoot-first landing without forcing your gait.',
        'The upper is a one-piece engineered mesh that breathes like a knit sock but locks down like a racing flat. A padded heel collar and anatomical footbed keep your foot centered through corners, and the carbon-rubber outsole delivers 400+ miles of confident grip in both wet and dry conditions.',
        'Whether you are logging easy miles before work, chasing a 5K PR, or building toward your first half marathon, the Apex Runner Pro is the rare do-everything trainer that never feels like a compromise. Reflective night detailing keeps you visible on early-morning and after-dark runs.'
      ],
      price: 129.99,
      oldPrice: 159.99,
      rating: 4.6, /* recomputed below from the reviews array */
      reviewCount: 218,
      stockStatus: 'In Stock',
      stockQty: 32,
      badge: '-19%',
      shippingDays: 2,
      soldUnits: 12480,
      colors: [
        { name: 'Ember Orange', hex: '#FF5A1F' },
        { name: 'Midnight Black', hex: '#1F2733' },
        { name: 'Storm Grey', hex: '#8B94A3' }
      ],
      sizes: ['US 7', 'US 8', 'US 9', 'US 10', 'US 11', 'US 12'],
      specs: {
        'Weight': '8.6 oz (US 9)',
        'Heel-to-toe drop': '8 mm',
        'Upper': 'Engineered one-piece mesh',
        'Midsole': 'ApexFoam+ super-critical foam',
        'Outsole': 'Carbon rubber, 400+ mile rating',
        'Best for': 'Daily training, tempo runs, 5K–half marathon',
        'Warranty': '2 years'
      },
      features: [
        'ApexFoam+ midsole delivers 12% more energy return than standard EVA',
        'Engineered mesh upper dries in minutes and resists blisters',
        'Carbon-rubber pods on high-wear zones for 400+ mile durability',
        'Padded heel collar with achilles cutout prevents slip and rub',
        '360° reflective detailing for low-light visibility'
      ],
      images: [img('stride-p1-hero')],
      galleryImages: [
        img('stride-p1-g1'), img('stride-p1-g2'), img('stride-p1-g3'),
        img('stride-p1-g4'), img('stride-p1-g5')
      ],
      detailImages: [
        { src: img('stride-p1-d1', 800, 600), caption: 'ApexFoam+ midsole', text: 'Super-critical foam cells compress and rebound instantly, softening landings without the squish of a max-cushion shoe.' },
        { src: img('stride-p1-d2', 800, 600), caption: 'Engineered mesh upper', text: 'Zoned density: open weave over the forefoot for airflow, tighter weave through the midfoot to hold you over the platform.' },
        { src: img('stride-p1-d3', 800, 600), caption: 'Carbon-rubber outsole', text: 'High-abrasion pods under the heel strike zone and big toe, where 90% of wear happens.' },
        { src: img('stride-p1-d4', 800, 600), caption: 'Padded heel collar', text: 'A plush achilles cutout cups the tendon without pressure, so no break-in period and no bloody socks.' },
        { src: img('stride-p1-d5', 800, 600), caption: '8 mm drop geometry', text: 'Encourages a natural midfoot strike — the sweet spot between zero-drop purism and max-cushion gentle entry.' },
        { src: img('stride-p1-d6', 800, 600), caption: 'Night detailing', text: 'Reflective yarns woven into the heel counter and toe box light up under headlights.' }
      ],
      reviews: [
        { name: 'Marcus Thompson', avatarInitials: 'MT', rating: 5, date: '2026-09-14', title: 'Replaced two pairs of shoes with this one', body: 'I run 35 miles a week and these have 220 miles on them with zero loss of bounce. The fit is true to size and the toe box actually lets my feet splay. Best trainer I have owned under $150.', verified: true, helpfulCount: 41, images: [img('stride-p1-r1a', 400, 400), img('stride-p1-r1b', 400, 400)] },
        { name: 'Priya Sharma', avatarInitials: 'PS', rating: 5, date: '2026-08-30', title: 'Cushioned but still fast', body: 'I was worried "light" would mean harsh, but the ApexFoam soaks up sidewalk impact beautifully. Ran a 10K PR in them two weeks after switching. The Ember Orange color is even brighter in person — I love it.', verified: true, helpfulCount: 28 },
        { name: 'Jordan Kim', avatarInitials: 'JK', rating: 4, date: '2026-08-11', title: 'Great shoe, slightly narrow', body: 'Everything about this shoe is excellent except the midfoot is a touch narrow for me. Went half a size up and the problem disappeared. Grip in the rain is genuinely impressive.', verified: true, helpfulCount: 19 },
        { name: 'Elena Rodriguez', avatarInitials: 'ER', rating: 5, date: '2026-07-22', title: 'Zero break-in period', body: 'Took these out of the box and ran 8 miles straight. No blisters, no hot spots, nothing. The heel collar is genius — it cups your achilles without pressing on it.', verified: true, helpfulCount: 33, images: [img('stride-p1-r4a', 400, 400), img('stride-p1-r4b', 400, 400)] },
        { name: 'Dave McKinley', avatarInitials: 'DM', rating: 4, date: '2026-07-05', title: 'Durable, breathable, nearly perfect', body: 'After 300 miles the outsole still looks barely worn. Only gripe: the stock insole is a bit flat, so I swapped in a custom orthotic and it has been flawless since.', verified: true, helpfulCount: 12 },
        { name: 'Aisha Bennett', avatarInitials: 'AB', rating: 4, date: '2026-06-18', title: 'Laces come untied', body: 'The ride and fit are fantastic, but I double-knot every run or the laces loosen. Annoying for a $130 shoe, hence 4 stars. Everything else — cushioning, weight, looks — is top shelf.', verified: false, helpfulCount: 8 },
        { name: 'Tom Nguyen', avatarInitials: 'TN', rating: 5, date: '2026-05-27', title: 'My fourth pair', body: 'Bought three previous versions of the Apex line and this is the best one yet. The foam lasts longer and the upper fixed the pinch issue my wide feet had. StrideLab nailed it.', verified: true, helpfulCount: 22 },
        { name: 'Lucy Carter', avatarInitials: 'LC', rating: 5, date: '2026-05-03', title: 'Perfect first running shoe', body: 'As a beginner I did not want to overspend, and this was on sale. It has made my couch-to-5K journey so much more comfortable. My knees genuinely feel the difference versus old gym shoes.', verified: true, helpfulCount: 15 }
      ]
    },

    /* ============ 2. ADJUSTABLE DUMBBELL ============ */
    {
      id: 'p2',
      slug: 'flexcore-24-adjustable-dumbbell',
      name: 'FlexCore 24 Adjustable Dumbbell',
      brand: 'IronForge',
      category: 'Strength',
      shortDescription: 'One dumbbell, fifteen weights: the FlexCore 24 dials from 5 to 24 lb in seconds and replaces a whole rack in the corner of a small apartment.',
      fullDescription: [
        'The FlexCore 24 replaces fifteen pairs of dumbbells with a single, space-saving unit. Twist the SelectDial handle to add or remove plates in 2.5 lb steps up to 10 lb, then 5 lb steps all the way to 24 lb. Changing weight mid-workout takes under four seconds, so supersets and drop sets actually happen.',
        'The plates are solid cast iron with a durable matte powder coat, seated in a reinforced nylon cradle that locks with an audible click — you will never hear a rattle mid-press. The knurled steel handle has a balanced 32 mm diameter that stays comfortable whether you are curling 10 lb or rowing 24 lb.',
        'Compact enough to slide under a bed and heavy enough to build real strength, the FlexCore 24 is the smartest square footage in home fitness. Choose a single dumbbell for unilateral work and circuits, or the pair for full barbell-replacement training.'
      ],
      price: 249.00,
      oldPrice: 299.00,
      rating: 4.8,
      reviewCount: 341,
      stockStatus: 'Low Stock',
      stockQty: 6,
      badge: 'Best Seller',
      shippingDays: 4,
      soldUnits: 8640,
      colors: [
        { name: 'Matte Black', hex: '#23262B' },
        { name: 'Gunmetal', hex: '#5A626D' }
      ],
      sizes: ['Single (5–24 lb)', 'Pair (2 × 5–24 lb)'],
      sizePrices: { 'Single (5–24 lb)': 249.00, 'Pair (2 × 5–24 lb)': 449.00 },
      specs: {
        'Weight range': '5–24 lb per dumbbell',
        'Increments': '2.5 lb (5–10 lb), then 5 lb',
        'Handle': 'Knurled chrome-plated steel, 32 mm',
        'Plates': 'Cast iron, powder-coated',
        'Cradle dimensions': '16.9 × 8.3 × 8.7 in',
        'Included': 'Dumbbell + cradle tray + quick-start guide',
        'Warranty': '2 years'
      },
      features: [
        'SelectDial changes weight in under 4 seconds — no pins, no levers',
        '15 weight settings from 5 to 24 lb replace an entire rack',
        'Audible-lock cradle guarantees zero plate rattle mid-set',
        'Knurled steel handle with anti-corrosion coating',
        'Compact cradle slides under beds or couches'
      ],
      images: [img('stride-p2-hero')],
      galleryImages: [
        img('stride-p2-g1'), img('stride-p2-g2'), img('stride-p2-g3'),
        img('stride-p2-g4'), img('stride-p2-g5')
      ],
      detailImages: [
        { src: img('stride-p2-d1', 800, 600), caption: 'SelectDial mechanism', text: 'A single twist locks only the plates you need. The spring-loaded pin engages every time — tested through 50,000 adjustment cycles.' },
        { src: img('stride-p2-d2', 800, 600), caption: 'Cast iron plates', text: 'Powder-coated for chip resistance and a secure grip when you rest them on your thighs during seated presses.' },
        { src: img('stride-p2-d3', 800, 600), caption: 'Locking cradle', text: 'Plates seat into the tray with an audible click, so you always know the dumbbell is safe to lift.' },
        { src: img('stride-p2-d4', 800, 600), caption: 'Knurled steel handle', text: 'A classic 32 mm knurl gives secure grip without shredding your palms during high-rep sets.' },
        { src: img('stride-p2-d5', 800, 600), caption: 'Compact footprint', text: 'The cradle takes about as much floor space as a shoebox — half of a single traditional dumbbell rack slot.' },
        { src: img('stride-p2-d6', 800, 600), caption: 'Floor-friendly base', text: 'Rubberized cradle feet protect hardwood and tile, and keep the unit from sliding during fast weight changes.' }
      ],
      reviews: [
        { name: 'Ryan Wallace', avatarInitials: 'RW', rating: 5, date: '2026-09-20', title: 'Replaced $600 of dumbbells', body: 'I sold my old 5–25 lb hex set after buying this. Same weight range in the footprint of a carry-on bag. The dial mechanism is smooth and I have never had a plate stick.', verified: true, helpfulCount: 47 },
        { name: 'Hannah Cole', avatarInitials: 'HC', rating: 5, date: '2026-09-02', title: 'Perfect for apartment training', body: 'I follow strength programs in my living room and this dumbbell covers everything from lateral raises to goblet squats. The click into the cradle is satisfyingly secure.', verified: true, helpfulCount: 31, images: [img('stride-p2-r2a', 400, 400), img('stride-p2-r2b', 400, 400)] },
        { name: 'Victor Osei', avatarInitials: 'VO', rating: 5, date: '2026-08-14', title: 'Built like a tank', body: 'Six months of daily use, dropped onto the cradle from a few inches plenty of times. Zero chips, zero rattles. The knurl is grippy without being painful.', verified: true, helpfulCount: 26 },
        { name: 'Mia Fontaine', avatarInitials: 'MF', rating: 4, date: '2026-07-28', title: 'Wish it went heavier', body: 'Excellent quality, but 24 lb is the ceiling. I have outgrown it for rows and squats and will add the 40 lb model next year. If you are a beginner or intermediate, this is perfect.', verified: true, helpfulCount: 18 },
        { name: 'Chris Delgado', avatarInitials: 'CD', rating: 5, date: '2026-07-10', title: 'Drop sets are finally practical', body: 'Changing weight mid-superset used to mean dragging plates around. Now it is a two-second twist. This single feature has made my workouts denser and shorter.', verified: true, helpfulCount: 22 },
        { name: 'Naomi Reed', avatarInitials: 'NR', rating: 5, date: '2026-06-21', title: 'Bought the pair — worth it', body: 'Started with one, ordered the second a month later for presses. The pair pricing made it painless. They stack neatly in their cradles in my closet corner.', verified: true, helpfulCount: 14 },
        { name: 'Sam Whitaker', avatarInitials: 'SW', rating: 4, date: '2026-06-02', title: 'Slight rattle at 5 lb setting', body: 'At the lightest setting there is a faint rattle when shaking the handle, which the manual says is normal clearance. From 10 lb up it is rock solid. Still my favorite purchase this year.', verified: false, helpfulCount: 9 },
        { name: 'Grace Liu', avatarInitials: 'GL', rating: 5, date: '2026-05-15', title: 'Great gift for my dad', body: 'Bought this for my 60-year-old dad who refuses to go to a gym. He uses it every morning while watching the news. The dial is easy on his arthritic hands.', verified: true, helpfulCount: 16 }
      ]
    },

    /* ============ 3. YOGA MAT ============ */
    {
      id: 'p3',
      slug: 'zenflow-pro-yoga-mat',
      name: 'ZenFlow Pro Yoga Mat',
      brand: 'Asana Flow',
      category: 'Yoga',
      shortDescription: 'A natural-rubber mat with a moisture-wicking PU top layer that grips harder the more you sweat — no towel needed for hot yoga.',
      fullDescription: [
        'The ZenFlow Pro solves the problem every yogi knows: the slippery down-dog. Its polyurethane top layer absorbs moisture and actually increases grip as you sweat, while the natural rubber base anchors the mat to hardwood, tile, and studio floors without a wobble.',
        'At 6 mm (or a cushier 8 mm), the closed-cell core cushions knees and wrists during long holds yet stays stable enough for balancing postures. Closed-cell construction means sweat and bacteria stay on the surface — a quick wipe-down keeps it fresh for years.',
        'Sustainably made with natural rubber and zero PVC or toxic plasticizers, the ZenFlow Pro comes with a carry strap and rolls tight enough to strap onto any backpack. It is the mat studio owners buy for themselves.'
      ],
      price: 49.95,
      oldPrice: 59.95,
      rating: 4.7,
      reviewCount: 164,
      stockStatus: 'In Stock',
      stockQty: 48,
      badge: 'New',
      shippingDays: 3,
      soldUnits: 9310,
      colors: [
        { name: 'Sage', hex: '#9CAF88' },
        { name: 'Terracotta', hex: '#C8674A' },
        { name: 'Charcoal', hex: '#3A3F45' },
        { name: 'Blush Rose', hex: '#DFA5AC' }
      ],
      sizes: ['6 mm', '8 mm'],
      specs: {
        'Thickness': '6 mm or 8 mm',
        'Material': 'Natural rubber base, PU moisture-wicking top',
        'Dimensions': '72 × 26 in (183 × 66 cm)',
        'Weight': '5.5 lb (6 mm) / 6.8 lb (8 mm)',
        'Surface': 'Non-slip wet & dry',
        'Care': 'Wipe with diluted vinegar spray, air dry',
        'Warranty': '1 year'
      },
      features: [
        'Grip intensifies with sweat — designed for hot yoga',
        'Natural rubber base grips hardwood, tile and studio floors',
        'Closed-cell surface blocks sweat and bacteria absorption',
        'Free of PVC, latex and heavy-metal plasticizers',
        'Carry strap included; rolls to 11 in diameter'
      ],
      images: [img('stride-p3-hero')],
      galleryImages: [
        img('stride-p3-g1'), img('stride-p3-g2'), img('stride-p3-g3'),
        img('stride-p3-g4'), img('stride-p3-g5')
      ],
      detailImages: [
        { src: img('stride-p3-d1', 800, 600), caption: 'PU sweat-grip surface', text: 'Polyurethane absorbs moisture instead of repelling it, so your hands stop sliding exactly when the class heats up.' },
        { src: img('stride-p3-d2', 800, 600), caption: 'Natural rubber base', text: 'Dense rubber tread grips smooth studio floors without leaving marks or curling at the corners.' },
        { src: img('stride-p3-d3', 800, 600), caption: 'Closed-cell core', text: 'Nothing soaks in: sweat, lotion or bacteria stay on top for a fast, hygienic wipe clean.' },
        { src: img('stride-p3-d4', 800, 600), caption: 'Joint-friendly cushioning', text: 'Choose 6 mm for balance work or 8 mm for sensitive knees during long floor sequences.' },
        { src: img('stride-p3-d5', 800, 600), caption: 'Alignment guides', text: 'Subtle center line and shoulder-width markers help you square up without cluttering the design.' },
        { src: img('stride-p3-d6', 800, 600), caption: 'Travel-ready roll', text: 'Rolls to an 11-inch circle and weighs about as much as a laptop — the included strap doubles as a shoulder sling.' }
      ],
      reviews: [
        { name: 'Sophie Marchetti', avatarInitials: 'SM', rating: 5, date: '2026-09-25', title: 'No more towel on top', body: 'I do hot yoga four times a week and used to layer a towel over my old mat. This one alone holds my hands and feet perfectly even in a 40°C room. Game changer.', verified: true, helpfulCount: 35 },
        { name: 'Daniel Okafor', avatarInitials: 'DO', rating: 5, date: '2026-09-08', title: 'Knees finally happy', body: 'Got the 8 mm after years of folding my old mat double under my knees. Supportive for balance poses yet genuinely cushioned for floor work. Worth every penny.', verified: true, helpfulCount: 24 },
        { name: 'Ingrid Halvorsen', avatarInitials: 'IH', rating: 4, date: '2026-08-19', title: 'Slight rubber smell at first', body: 'Out of the box there was a natural rubber smell for about four days. After airing it out on the balcony it is completely fine. Grip and quality are excellent.', verified: true, helpfulCount: 21 },
        { name: 'Ben Torres', avatarInitials: 'BT', rating: 5, date: '2026-08-01', title: 'Beginner to daily practice', body: 'Six months in, practiced four to five times a week, and the surface still looks new. The Sage color is calming and exactly as pictured.', verified: true, helpfulCount: 17, images: [img('stride-p3-r4a', 400, 400), img('stride-p3-r4b', 400, 400)] },
        { name: 'Fatima Zahra', avatarInitials: 'FZ', rating: 5, date: '2026-07-12', title: 'Stays flat, stays put', body: 'My old mat curled at the corners and slid on tile. This one lies flat within seconds of unrolling and has never shifted under me, even in jump-throughs.', verified: true, helpfulCount: 19 },
        { name: 'Oliver Grant', avatarInitials: 'OG', rating: 4, date: '2026-06-24', title: 'Heavy but worth it', body: 'At 5.5 lb it is heavier than the cheap mat it replaced, which makes my walk to the studio a mini workout. The grip is unmatched though — I sold my old mat a week in.', verified: false, helpfulCount: 10 },
        { name: 'Chloe Park', avatarInitials: 'CP', rating: 5, date: '2026-06-06', title: 'Beautiful and functional', body: 'The Terracotta color gets compliments in every class. Functionally it is the best mat I have owned: no slipping, easy to clean, and the alignment line actually helps my form.', verified: true, helpfulCount: 13 },
        { name: 'Marcus Webb', avatarInitials: 'MW', rating: 5, date: '2026-05-18', title: 'Eco-friendly and durable', body: 'I wanted to stop buying PVC mats every year. This rubber mat shows almost no wear after months of daily use. It is the last mat I plan to buy for a long time.', verified: true, helpfulCount: 15 },
        { name: 'Amara Diallo', avatarInitials: 'AD', rating: 4, date: '2026-04-30', title: 'Great mat, tight roll', body: 'Quality is superb. Only note: it rolls quite tight, so give it a week to fully relax flat at the ends. Grip is fantastic from day one.', verified: true, helpfulCount: 8 },
        { name: 'Liam Murphy', avatarInitials: 'LM', rating: 5, date: '2026-04-12', title: 'Studio owner approved', body: 'I teach 12 classes a week and bought this as my personal mat after testing it in class. It absorbs sweat better than mats twice the price.', verified: true, helpfulCount: 26 }
      ]
    },

    /* ============ 4. BADMINTON RACKET ============ */
    {
      id: 'p4',
      slug: 'vortex-900-pro-badminton-racket',
      name: 'Vortex 900 Pro Badminton Racket',
      brand: 'Vortex',
      category: 'Racket Sports',
      shortDescription: 'An 83 g head-light racket with ultra-high-modulus graphite shaft — engineered for lightning wrist work, tight net play and effortless defense.',
      fullDescription: [
        'The Vortex 900 Pro is built for players who win with speed. At 83 grams (4U) and head-light balanced, it whips through the air fast enough to turn defense into attack — drives, blocks and lifts come off the string bed before your opponent has reset.',
        'The ultra-high-modulus graphite shaft is slim (6.6 mm) and stiff, translating wrist power into shuttle speed with almost no energy loss. An aero-compact frame cuts drag on swings while keeping a forgiving sweetspot for off-center returns.',
        'Pre-strung at 26 lb and re-stringable up to 32 lb for advanced players, the 900 Pro ships with a full-length zip cover and is offered in two grip sizes. Note: this colorway is currently sold out — join the restock waitlist from the product page.'
      ],
      price: 89.00,
      oldPrice: 109.00,
      rating: 4.5,
      reviewCount: 97,
      stockStatus: 'Out of Stock',
      stockQty: 0,
      badge: '',
      shippingDays: 2,
      soldUnits: 5210,
      colors: [
        { name: 'Blaze Red', hex: '#D22F2F' },
        { name: 'Cobalt Blue', hex: '#2B5BD7' }
      ],
      sizes: ['G4 (3.5 in)', 'G5 (3.25 in)'],
      specs: {
        'Weight': '83 g (4U)',
        'Balance': 'Head-light, 295 mm',
        'Shaft': 'Ultra-high-modulus graphite, 6.6 mm',
        'Flex': 'Stiff',
        'String tension': 'Ships at 26 lb, max 32 lb',
        'Included': 'Full-length zip cover',
        'Warranty': '1 year (frame)'
      },
      features: [
        '83 g frame — one of the fastest swings in its class',
        'Ultra-high-modulus graphite shaft for crisp power transfer',
        'Aero-compact frame cuts drag without shrinking the sweetspot',
        'Pre-strung at 26 lb; holds tension up to 32 lb',
        'Zip cover included for protection between matches'
      ],
      images: [img('stride-p4-hero')],
      galleryImages: [
        img('stride-p4-g1'), img('stride-p4-g2'), img('stride-p4-g3'),
        img('stride-p4-g4'), img('stride-p4-g5')
      ],
      detailImages: [
        { src: img('stride-p4-d1', 800, 600), caption: 'Aero-compact frame', text: 'The teardrop cross-section slices through air on swings while keeping the string bed stable on impact.' },
        { src: img('stride-p4-d2', 800, 600), caption: 'Ultra-high-modulus shaft', text: 'The 6.6 mm stiff shaft loads and unloads like a spring — net kills arrive with surprising pace for an 83 g frame.' },
        { src: img('stride-p4-d3', 800, 600), caption: 'Carbon weave finish', text: 'Beyond looks, the visible carbon weave adds torsional stability so the face stays square on mishits.' },
        { src: img('stride-p4-d4', 800, 600), caption: 'Anti-vibration grommets', text: 'Softer grommet strips at the 3 and 9 o\'clock positions reduce string vibration on blocks and drives.' },
        { src: img('stride-p4-d5', 800, 600), caption: 'Polyurethane grip', text: 'The stock PU grip is tacky and sweat-resistant; replaceable with overgrips without changing balance.' },
        { src: img('stride-p4-d6', 800, 600), caption: 'Full-length zip cover', text: 'A padded cover protects the frame and strings in your bag — no extra purchase needed.' }
      ],
      reviews: [
        { name: 'Kenny Osei', avatarInitials: 'KO', rating: 5, date: '2026-09-10', title: 'Defense became my weapon', body: 'This racket is absurdly fast on defense. Drives that used to pass me now come back flat and aggressive. Took two weeks to adjust from my head-heavy frame, and now I never look back.', verified: true, helpfulCount: 24 },
        { name: 'Rina Suzuki', avatarInitials: 'RS', rating: 5, date: '2026-08-22', title: 'Perfect for doubles front court', body: 'Net play is where this racket shines — kills and tight net shots just happen. At G5 the grip fits my hand perfectly. Worth re-stringing to 28 lb for even crisper response.', verified: true, helpfulCount: 18 },
        { name: 'Peter Lindqvist', avatarInitials: 'PL', rating: 4, date: '2026-08-03', title: 'Fast but needs strong wrists', body: 'Spectacular racket if you generate your own power. Smashes are noticeably shorter than my old head-heavy racket unless you time the whip properly. Skilled intermediates will love it; raw beginners may struggle.', verified: true, helpfulCount: 15 },
        { name: 'Arjun Mehta', avatarInitials: 'AM', rating: 5, date: '2026-07-15', title: 'Stock strings are legit', body: 'Normally I restring immediately, but the factory 26 lb setup plays beautifully. Held tension for three months of twice-weekly play before I noticed any drop.', verified: true, helpfulCount: 11, images: [img('stride-p4-r4a', 400, 400), img('stride-p4-r4b', 400, 400)] },
        { name: 'Colette Dubois', avatarInitials: 'CD', rating: 4, date: '2026-06-27', title: 'Paint chips if you clash', body: 'In doubles I have clipped my partner\'s racket twice and the paint chips show bare carbon underneath. Performance is unaffected and it still looks mean, so 4 stars.', verified: true, helpfulCount: 9 },
        { name: 'Wong Kai-Ming', avatarInitials: 'WK', rating: 5, date: '2026-06-09', title: 'Beats rackets twice the price', body: 'I have used rackets in the $150–200 range and the 900 Pro matches their speed and feel. The stiff shaft rewards clean technique. Best value in the shop right now.', verified: true, helpfulCount: 20 },
        { name: 'Sara Almeida', avatarInitials: 'SA', rating: 4, date: '2026-05-21', title: 'Grip ran small for me', body: 'G4 felt slim in my larger hands — an overgrip fixed it. Otherwise a dream: light, quick, and the Cobalt Blue is gorgeous in person.', verified: false, helpfulCount: 7 },
        { name: 'Tobias Fischer', avatarInitials: 'TF', rating: 5, date: '2026-05-02', title: 'My club teammates switched too', body: 'After trying mine, three people in my club bought the same racket. That says everything. Fast, precise, and the cover is actually decent quality.', verified: true, helpfulCount: 13 }
      ]
    },

    /* ============ 5. BASKETBALL ============ */
    {
      id: 'p5',
      slug: 'thundercourt-pro-basketball',
      name: 'ThunderCourt Pro Basketball',
      brand: 'CourtKings',
      category: 'Team Sports',
      shortDescription: 'A deep-channel composite-leather ball with NFHS-standard bounce that plays soft indoors and survives concrete outdoors — no break-in needed.',
      fullDescription: [
        'The ThunderCourt Pro is the rare ball that feels at home on a polished gym floor and a gritty park court. Its moisture-wicking composite leather cover starts tacky out of the box — no weeks of breaking in — and the reinforced butyl bladder holds air for months, not weeks.',
        'Deep pebbling and wide channels give serious finger control for handles and a trustworthy grip when palms sweat. The bounce is tuned to NFHS standards, so rebounds and bank shots behave the way they do in organized play.',
        'Available in official sizes 5, 6 and 7, the ThunderCourt Pro is the ball coaches hand to developing players and veterans refuse to give back. It also makes a perfect gift — it arrives in a display-ready box.'
      ],
      price: 39.99,
      oldPrice: 49.99,
      rating: 4.4,
      reviewCount: 152,
      stockStatus: 'In Stock',
      stockQty: 60,
      badge: '-20%',
      shippingDays: 3,
      soldUnits: 15230,
      colors: [
        { name: 'Classic Amber', hex: '#D3611D' },
        { name: 'Night Black', hex: '#23262B' },
        { name: 'Ocean Blue', hex: '#2C6E9E' }
      ],
      sizes: ['Size 5 · Youth (27.5")', 'Size 6 · Women (28.5")', 'Size 7 · Men (29.5")'],
      specs: {
        'Cover': 'Moisture-wicking composite leather',
        'Bladder': 'Reinforced butyl, holds air 3+ months',
        'Construction': '12-panel, deep-channel design',
        'Bounce': 'NFHS-standard (54 ± 2 in from 72 in drop)',
        'Use': 'Indoor & outdoor',
        'Ships deflated': 'Yes — pump required (needle included)',
        'Warranty': '1 year'
      },
      features: [
        'Game-ready tackiness straight out of the box',
        'Deep channels + aggressive pebbling for wet-palm control',
        'Butyl bladder holds pressure 3× longer than budget balls',
        'NFHS-standard bounce for true rebounds and bank shots',
        'Reinforced cover rated for outdoor concrete'
      ],
      images: [img('stride-p5-hero')],
      galleryImages: [
        img('stride-p5-g1'), img('stride-p5-g2'), img('stride-p5-g3'),
        img('stride-p5-g4'), img('stride-p5-g5')
      ],
      detailImages: [
        { src: img('stride-p5-d1', 800, 600), caption: 'Composite leather cover', text: 'Soft enough for gym floors, tough enough for blacktop. It wicks palm sweat instead of turning slick like cheap rubber balls.' },
        { src: img('stride-p5-d2', 800, 600), caption: 'Deep-channel design', text: 'Wide channels give your fingertips consistent landmarks for shooting touch and crossover control.' },
        { src: img('stride-p5-d3', 800, 600), caption: 'Aggressive pebbling', text: 'The raised grain pattern locks into your palm — noticeably better grip when the game gets physical.' },
        { src: img('stride-p5-d4', 800, 600), caption: 'Butyl air bladder', text: 'Holds pressure for months. One pump per season instead of one pump per week.' },
        { src: img('stride-p5-d5', 800, 600), caption: 'NFHS-standard bounce', text: 'Drops and rebounds to regulation height, so practice translates directly to game situations.' },
        { src: img('stride-p5-d6', 800, 600), caption: 'Display-ready box', text: 'Ships in a gift box with needle and mesh bag included — perfect for birthdays and season openers.' }
      ],
      reviews: [
        { name: 'Andre Simmons', avatarInitials: 'AS', rating: 5, date: '2026-09-18', title: 'Survives the blacktop', body: 'Two months on rough outdoor courts and the cover still looks 90%. Grip remains tacky after rain (dried it off properly). This is my third "outdoor-rated" ball and the first that delivers.', verified: true, helpfulCount: 29 },
        { name: 'Jasmine Cole', avatarInitials: 'JC', rating: 5, date: '2026-08-29', title: 'Great for my daughters', body: 'Bought the size 6 for my 14-year-old. The grip is confidence-inspiring for smaller hands and the bounce is true. She made her school team using this ball in practice.', verified: true, helpfulCount: 21 },
        { name: 'Rob Turner', avatarInitials: 'RT', rating: 4, date: '2026-08-10', title: 'Excellent ball, ships flat', body: 'Quality is top-tier once inflated. Just note it arrives deflated and the included needle is tiny — keep track of it. Holds air well: topped it up once in two months.', verified: true, helpfulCount: 17 },
        { name: 'DeShawn Ellis', avatarInitials: 'DE', rating: 5, date: '2026-07-21', title: 'Handles like a $80 ball', body: 'The deep channels make crossovers feel crisp. My teammates keep stealing it between games, so I had to write my name on it. That is the highest praise for a basketball.', verified: true, helpfulCount: 24, images: [img('stride-p5-r4a', 400, 400), img('stride-p5-r4b', 400, 400)] },
        { name: 'Kelly Brandt', avatarInitials: 'KB', rating: 4, date: '2026-07-02', title: 'Slightly firm at first', body: 'Out of the box it played a bit firm; after a week it softened into the sweet spot. Now it is the smoothest ball at our rec league. Docking a star only for the break-in week.', verified: false, helpfulCount: 8 },
        { name: 'Yusuf Karim', avatarInitials: 'YK', rating: 5, date: '2026-06-14', title: 'Gift box is a nice touch', body: 'Bought this as a birthday gift and it arrived in a proper display box with a mesh bag. My brother thought I spent twice as much. The ball itself is genuinely excellent.', verified: true, helpfulCount: 12 },
        { name: 'Nina Petrova', avatarInitials: 'NP', rating: 4, date: '2026-05-26', title: 'Bounce is regulation-true', body: 'I coach middle school and we use size 5 versions. Consistent bounce helps kids develop real touch. One ball developed a slight scuff after concrete use, still plays fine.', verified: true, helpfulCount: 15 },
        { name: 'Omar Farouk', avatarInitials: 'OF', rating: 4, date: '2026-05-08', title: 'Very good, not perfect', body: 'Grip and durability are outstanding. My only issue: the black colorway shows dust on gym floors. Cosmetic nitpick on an otherwise superb ball for the price.', verified: true, helpfulCount: 6 },
        { name: 'Ella Johansson', avatarInitials: 'EJ', rating: 5, date: '2026-04-20', title: 'Beach → park → gym', body: 'I play everywhere and this ball handles all of it. Sand brushed off easily, no warping, and it still bounces true indoors. One ball for everything, finally.', verified: true, helpfulCount: 10 },
        { name: 'Chris Mantle', avatarInitials: 'CM', rating: 4, date: '2026-04-01', title: 'Solid upgrade over sporting-goods brands', body: 'Compared side-by-side with the big-box brands, this one has deeper channels and better moisture handling. Air retention is the real win — three months, one top-up.', verified: true, helpfulCount: 9 }
      ]
    },

    /* ============ 6. CYCLING HELMET ============ */
    {
      id: 'p6',
      slug: 'aeroshield-mips-cycling-helmet',
      name: 'AeroShield MIPS Cycling Helmet',
      brand: 'AeroShield',
      category: 'Cycling',
      shortDescription: 'A 11.2 oz road helmet with MIPS rotational protection, 18 vents, and a 360° micro-dial fit system that disappears on your head.',
      fullDescription: [
        'The AeroShield MIPS pairs a featherweight in-mold polycarbonate shell with the MIPS rotational-protection liner, designed to reduce rotational forces during angled impacts. At just 11.2 oz in size M, you will forget you are wearing it until you catch your reflection.',
        'Eighteen wind-tunnel-placed vents pull air across your scalp at any speed, and the internal channeling exhausts heat on climbs. The 360° micro-dial retention system tightens evenly around your whole head — no pressure points, no forehead hot spots, even on three-hour rides.',
        'Certified to CPSC 1203 and EN 1078 standards, the AeroShield MIPS includes a removable, washable pad set and a light-clip mount on the rear. It is the helmet our own staff reach for on every ride.'
      ],
      price: 119.00,
      oldPrice: 139.00,
      rating: 4.9,
      reviewCount: 189,
      stockStatus: 'Low Stock',
      stockQty: 4,
      badge: "Editor's Pick",
      shippingDays: 2,
      soldUnits: 7150,
      colors: [
        { name: 'Matte White', hex: '#E8EAE3' },
        { name: 'Jet Black', hex: '#1B1D21' },
        { name: 'Viper Green', hex: '#3FA34D' }
      ],
      sizes: ['S (51–55 cm)', 'M (55–59 cm)', 'L (59–63 cm)'],
      specs: {
        'Weight': '11.2 oz / 320 g (size M)',
        'Shell': 'In-mold polycarbonate with EPS liner',
        'Protection': 'MIPS rotational liner, CPSC 1203 + EN 1078',
        'Vents': '18 with internal channeling',
        'Fit system': '360° micro-dial retention',
        'Extras': 'Removable washable pads, rear light clip',
        'Warranty': '2 years'
      },
      features: [
        'MIPS liner reduces rotational forces in angled crashes',
        '18 vents + internal channeling keep you cool on climbs',
        '11.2 oz — lighter than helmets costing twice as much',
        '360° micro-dial fit: even pressure, zero hot spots',
        'Rear light-clip mount and washable pad set included'
      ],
      images: [img('stride-p6-hero')],
      galleryImages: [
        img('stride-p6-g1'), img('stride-p6-g2'), img('stride-p6-g3'),
        img('stride-p6-g4'), img('stride-p6-g5')
      ],
      detailImages: [
        { src: img('stride-p6-d1', 800, 600), caption: 'MIPS rotational liner', text: 'A low-friction layer lets the shell slide 10–15 mm relative to your head during angled impacts, redirecting rotational energy.' },
        { src: img('stride-p6-d2', 800, 600), caption: 'In-mold construction', text: 'The polycarbonate shell is fused with the EPS liner in one process — lighter and stronger than glued shells.' },
        { src: img('stride-p6-d3', 800, 600), caption: '18-vent airflow', text: 'Wind-tunnel placement pulls air in at the front and exhausts it at the rear; internal channels feed the breeze across your scalp.' },
        { src: img('stride-p6-d4', 800, 600), caption: '360° micro-dial', text: 'One dial tightens a full ring around your head for even pressure — no more forehead pinch from old-school straps.' },
        { src: img('stride-p6-d5', 800, 600), caption: 'Rear light mount', text: 'A integrated clip point accepts most blinker lights, keeping your night rides visible without zip ties.' },
        { src: img('stride-p6-d6', 800, 600), caption: 'Washable pads', text: 'The antimicrobial pad set pops out for washing, so the helmet stays fresh through a full season of summer rides.' }
      ],
      reviews: [
        { name: 'Tomas Bergstrom', avatarInitials: 'TB', rating: 5, date: '2026-09-28', title: 'Forgot I was wearing it', body: 'Weight and airflow are phenomenal. On 90°F rides my head stays noticeably cooler than with my old helmet. The micro-dial gives a secure fit without any pressure points.', verified: true, helpfulCount: 38 },
        { name: 'Alicia Moreno', avatarInitials: 'AM', rating: 5, date: '2026-09-12', title: 'MIPS peace of mind', body: 'I crashed at 22 mph six weeks after buying this — angled impact on the shoulder-side of the helmet. Walked away with road rash only. The shell did exactly what MIPS promises. Buying the same one again.', verified: true, helpfulCount: 52, images: [img('stride-p6-r2a', 400, 400), img('stride-p6-r2b', 400, 400)] },
        { name: 'Henrik Olsen', avatarInitials: 'HO', rating: 5, date: '2026-08-25', title: 'Lighter than my $250 helmet', body: 'I weighed both on the kitchen scale. This is 40 g lighter than my previous premium helmet and vents just as well. Absurd value.', verified: true, helpfulCount: 27 },
        { name: 'Bianca Rossi', avatarInitials: 'BR', rating: 5, date: '2026-08-06', title: 'Fits small heads properly', body: 'Size S actually fits my 53 cm head snugly without the shell sitting on my eyebrows. Most "small" helmets feel like medium. The dial adjusts finer than any helmet I have tried.', verified: true, helpfulCount: 19 },
        { name: 'George Barnes', avatarInitials: 'GB', rating: 4, date: '2026-07-18', title: 'Straps took patience', body: 'Adjusting the straps to sit flat took me 15 minutes and a YouTube video. Once set, they never moved again. Comfort and ventilation are five-star; the setup is the only quibble.', verified: true, helpfulCount: 12 },
        { name: 'Yuki Tanaka', avatarInitials: 'YT', rating: 5, date: '2026-06-30', title: 'Quiet in the wind', body: 'No whistle or roar at 25+ mph descents — the vent shaping is genuinely aerodynamic. The Viper Green is also highly visible to drivers, which my spouse insisted on.', verified: true, helpfulCount: 16 },
        { name: 'Peter van Dijk', avatarInitials: 'PV', rating: 5, date: '2026-06-11', title: 'Two years, zero complaints', body: 'Bought the first version of my review cycle two years ago (this is my second for my wife). Both have held up: pads washed dozens of times, shell unmarked. Trustworthy brand.', verified: true, helpfulCount: 21 },
        { name: 'Marta Kowalska', avatarInitials: 'MK', rating: 4, date: '2026-05-23', title: 'Wish it had a visor option', body: 'For road riding it is perfect. For gravel on bright days I miss a visor — sunglasses help but a bolt-on visor would earn the fifth star. Everything else is superb.', verified: false, helpfulCount: 8 },
        { name: 'Samuel Adeyemi', avatarInitials: 'SA', rating: 5, date: '2026-05-05', title: 'Bought two more for the family', body: 'After two months on my own head I ordered ones for my wife and son. The size range covers us all and the quality is identical across sizes.', verified: true, helpfulCount: 14 },
        { name: 'Claire Beaumont', avatarInitials: 'CB', rating: 5, date: '2026-04-16', title: 'Safety without the sweat', body: 'My old MIPS helmet cooked me on climbs. This one exhausts heat so well I rarely notice the difference between wearing it and not. Safety gear you actually want to wear.', verified: true, helpfulCount: 23 }
      ]
    }
  ];

  /* ----------------------------------------------------------
     Derive true ratings from review arrays + stable review IDs
     ---------------------------------------------------------- */
  products.forEach(function (p) {
    if (p.reviews && p.reviews.length) {
      var sum = p.reviews.reduce(function (acc, r) { return acc + r.rating; }, 0);
      p.rating = Math.round((sum / p.reviews.length) * 10) / 10;
    }
    (p.reviews || []).forEach(function (r, i) { r.id = p.id + '-r' + (i + 1); });
  });

  /* ----------------------------------------------------------
     Homepage content (testimonials + category tiles)
     ---------------------------------------------------------- */
  var homeContent = {
    heroImage: img('stride-hero-main', 1600, 900),
    promoImage: img('stride-promo-banner', 900, 700),
    categories: [
      { name: 'Running',       image: img('stride-cat-running', 600, 640), href: 'product-1.html' },
      { name: 'Strength',      image: img('stride-cat-strength', 600, 640), href: 'product-2.html' },
      { name: 'Yoga',          image: img('stride-cat-yoga', 600, 640), href: 'product-3.html' },
      { name: 'Racket Sports', image: img('stride-cat-racket', 600, 640), href: 'product-4.html' },
      { name: 'Team Sports',   image: img('stride-cat-team', 600, 640), href: 'product-5.html' },
      { name: 'Cycling',       image: img('stride-cat-cycling', 600, 640), href: 'product-6.html' }
    ],
    testimonials: [
      { name: 'Maya Johnson',  detail: 'Marathon runner · Chicago',      avatar: img('stride-face-1', 120, 120), quote: 'Ordered my Apex Runners on Tuesday, ran in them Thursday. The COD option means I never worry about online purchases again.', rating: 5 },
      { name: 'Carlos Mendes', detail: 'Cycling club president · Austin', avatar: img('stride-face-2', 120, 120), quote: 'We equipped our whole club with AeroShield helmets. Real warranty support, real people, and prices that beat the big-box stores.', rating: 5 },
      { name: 'Rachel Kim',    detail: 'Yoga instructor · Seattle',       avatar: img('stride-face-3', 120, 120), quote: 'The ZenFlow mat is the one I recommend to every student. Grip when wet is unreal, and it still looks new after a year of daily classes.', rating: 5 },
      { name: 'Daniel Brooks', detail: 'Rec league captain · Denver',     avatar: img('stride-face-4', 120, 120), quote: 'Bought the ThunderCourt balls for our league. Two seasons on concrete and they still bounce true. Customer service answered me in an hour.', rating: 4 }
    ],
    faq: [
      { q: 'How does Cash on Delivery work?', a: 'Place your order without paying online. When the courier arrives, inspect your items, then pay in cash or by card on the spot. No prepayment, no hidden fees.' },
      { q: 'How fast will my order arrive?', a: 'Most orders ship within 2 business days. Delivery takes 2–5 business days depending on your state — the exact range is shown on every product page once you select your state.' },
      { q: 'What is your return policy?', a: '30-day hassle-free returns on everything. If it does not fit or feel right, start a return from your order email and we send a prepaid label. Refunds are processed within 3 business days of pickup.' },
      { q: 'Is my payment secure?', a: 'Yes. With COD you only pay when the goods are in your hands. For card payments we use bank-grade 256-bit encryption and never store your card details.' }
    ]
  };

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  return {
    config: CONFIG,
    usStates: US_STATES,
    products: products,
    home: homeContent,
    stateByCode: US_STATES.reduce(function (map, s) { map[s.code] = s; return map; }, {}),
    findProduct: function (id) {
      return products.filter(function (p) { return p.id === id; })[0] || null;
    }
  };
})();
