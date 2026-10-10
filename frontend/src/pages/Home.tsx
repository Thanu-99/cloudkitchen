import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Clock3,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Minus,
  X,
  Trash2,
  Activity,
} from "lucide-react";

import api from "../services/api";
import { placeOrder } from "../services/orderService";

/* =========================================================
   TYPES
========================================================= */

type Category = "Pizza" | "Burgers" | "Bowls" | "Desserts";

interface CategoryItem {
  name: string;
  image: string;
}

interface BackendItem {
  name: string;
  price: number;
}

interface BackendRestaurant {
  name: string;
  items?: BackendItem[];
}

interface Dish {
  name: string;
  description: string;
  price: number;
  image: string;
  category: Category;
  restaurant: string;
  rating: number;
}

interface CartItem extends Dish {
  quantity: number;
}

interface OrderResponse {
  message: string;
  order: {
    restaurant: string;
    item: string;
    quantity: number;
    unitPrice: number;
    total: number;
    processingTimeMs: number;
  };
}

/* =========================================================
   CONSTANTS
========================================================= */

const GRAFANA_URL =
  "https://cloudbites-grafana-azcjebardpbmghdw.cin.grafana.azure.com";

/*
 * Your original category UI is preserved.
 * These are only presentation images.
 */
const categories: CategoryItem[] = [
  {
    name: "Pizza",
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=90",
  },
  {
    name: "Burgers",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=90",
  },
  {
    name: "Bowls",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=90",
  },
  {
    name: "Desserts",
    image:
      "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=90",
  },
];

/*
 * Fallback data matches the REAL backend menu.
 * It is only used if /api/restaurants temporarily fails.
 */
const fallbackDishes: Dish[] = [
  {
    name: "Margherita Pizza",
    description: "Classic tomato · mozzarella · fresh herbs",
    price: 299,
    image:
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=90",
    category: "Pizza",
    restaurant: "Pizza Palace",
    rating: 4.9,
  },
  {
    name: "Farmhouse Pizza",
    description: "Fresh vegetables · mozzarella · house seasoning",
    price: 399,
    image:
      "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=90",
    category: "Pizza",
    restaurant: "Pizza Palace",
    rating: 4.9,
  },
  {
    name: "Cheese Burst Pizza",
    description: "Loaded cheese · golden crust · rich tomato sauce",
    price: 449,
    image:
      "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=90",
    category: "Pizza",
    restaurant: "Pizza Palace",
    rating: 4.9,
  },
  {
    name: "Cheeseburger",
    description: "Beef patty · aged cheddar · house sauce",
    price: 249,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=90",
    category: "Burgers",
    restaurant: "Burger House",
    rating: 4.9,
  },
  {
    name: "Chicken Burger",
    description: "Crispy chicken · lettuce · signature sauce",
    price: 279,
    image:
      "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=1000&q=90",
    category: "Burgers",
    restaurant: "Burger House",
    rating: 4.9,
  },
  {
    name: "Double Smash Burger",
    description: "Double beef · aged cheddar · house sauce",
    price: 329,
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=90",
    category: "Burgers",
    restaurant: "Burger House",
    rating: 4.9,
  },
  {
    name: "Teriyaki Chicken Bowl",
    description: "Chicken · greens · teriyaki glaze",
    price: 349,
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=90",
    category: "Bowls",
    restaurant: "Bowl Factory",
    rating: 4.9,
  },
  {
    name: "Paneer Power Bowl",
    description: "Paneer · fresh vegetables · signature dressing",
    price: 299,
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=90",
    category: "Bowls",
    restaurant: "Bowl Factory",
    rating: 4.9,
  },
  {
    name: "Asian Veggie Bowl",
    description: "Seasonal vegetables · rice · Asian dressing",
    price: 279,
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=90",
    category: "Bowls",
    restaurant: "Bowl Factory",
    rating: 4.9,
  },
];

/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN")}`;

const getCategoryForItem = (
  restaurant: string,
  item: string
): Category => {
  const restaurantLower = restaurant.toLowerCase();
  const itemLower = item.toLowerCase();

  if (restaurantLower.includes("pizza") || itemLower.includes("pizza")) {
    return "Pizza";
  }

  if (
    restaurantLower.includes("burger") ||
    itemLower.includes("burger")
  ) {
    return "Burgers";
  }

  if (
    restaurantLower.includes("bowl") ||
    itemLower.includes("bowl")
  ) {
    return "Bowls";
  }

  return "Desserts";
};

const getDescription = (item: string): string => {
  const descriptions: Record<string, string> = {
    "Margherita Pizza":
      "Classic tomato · mozzarella · fresh herbs",
    "Farmhouse Pizza":
      "Fresh vegetables · mozzarella · house seasoning",
    "Cheese Burst Pizza":
      "Loaded cheese · golden crust · rich tomato sauce",
    Cheeseburger:
      "Beef patty · aged cheddar · house sauce",
    "Chicken Burger":
      "Crispy chicken · lettuce · signature sauce",
    "Double Smash Burger":
      "Double beef · aged cheddar · house sauce",
    "Teriyaki Chicken Bowl":
      "Chicken · greens · teriyaki glaze",
    "Paneer Power Bowl":
      "Paneer · fresh vegetables · signature dressing",
    "Asian Veggie Bowl":
      "Seasonal vegetables · rice · Asian dressing",
  };

  return (
    descriptions[item] ??
    "Freshly prepared with quality ingredients"
  );
};

const getImageForItem = (item: string): string => {
  const itemLower = item.toLowerCase();

  if (itemLower.includes("pizza")) {
    return "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=90";
  }

  if (itemLower.includes("burger")) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=90";
  }

  if (itemLower.includes("bowl")) {
    return "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=90";
  }

  return "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1000&q=90";
};

/* =========================================================
   COMPONENT
========================================================= */

function Home() {
  /* -------------------------------------------------------
     BACKEND MENU
  ------------------------------------------------------- */

  const [dishes, setDishes] = useState<Dish[]>(fallbackDishes);

  const [backendOnline, setBackendOnline] = useState(false);

  /* -------------------------------------------------------
     UI STATE
  ------------------------------------------------------- */

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [location, setLocation] = useState("Hyderabad");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [ordering, setOrdering] = useState(false);

  const [notification, setNotification] = useState("");

  const [rushRunning, setRushRunning] = useState(false);
  const [rushOrders, setRushOrders] = useState(0);

  const [lastOrder, setLastOrder] =
    useState<OrderResponse["order"] | null>(null);

  /* =======================================================
     LOAD BACKEND
  ======================================================= */

  useEffect(() => {
    const loadBackend = async () => {
      try {
        await api.get("/health");

        setBackendOnline(true);

        const response = await api.get<BackendRestaurant[]>(
          "/api/restaurants"
        );

        const restaurants = Array.isArray(response.data)
          ? response.data
          : [];

        const backendDishes: Dish[] = [];

        restaurants.forEach((restaurant) => {
          restaurant.items?.forEach((item) => {
            const category = getCategoryForItem(
              restaurant.name,
              item.name
            );

            backendDishes.push({
              name: item.name,
              description: getDescription(item.name),
              price: item.price,
              image: getImageForItem(item.name),
              category,
              restaurant: restaurant.name,
              rating: 4.9,
            });
          });
        });

        if (backendDishes.length > 0) {
          setDishes(backendDishes);
        }
      } catch (error) {
        console.error("CloudBites backend unavailable:", error);
        setBackendOnline(false);
        setDishes(fallbackDishes);
      }
    };

    loadBackend();
  }, []);

  /* =======================================================
     NOTIFICATION
  ======================================================= */

  const showNotification = (message: string) => {
    setNotification(message);

    window.setTimeout(() => {
      setNotification("");
    }, 3000);
  };

  /* =======================================================
     CART
  ======================================================= */

  const addToCart = (dish: Dish) => {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) =>
          item.name === dish.name &&
          item.restaurant === dish.restaurant
      );

      if (existing) {
        return currentCart.map((item) =>
          item.name === dish.name &&
          item.restaurant === dish.restaurant
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...dish,
          quantity: 1,
        },
      ];
    });

    showNotification(`${dish.name} added to your order`);
  };

  const removeFromCart = (dish: CartItem) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          !(
            item.name === dish.name &&
            item.restaurant === dish.restaurant
          )
      )
    );
  };

  const updateQuantity = (
    dish: CartItem,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeFromCart(dish);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.name === dish.name &&
        item.restaurant === dish.restaurant
          ? {
              ...item,
              quantity,
            }
          : item
      )
    );
  };

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  /* =======================================================
     REAL BACKEND ORDER
  ======================================================= */

  const orderDish = async (
    dish: Dish,
    quantity = 1
  ) => {
    if (ordering) return;

    try {
      setOrdering(true);

      const response = await placeOrder(
        dish.restaurant,
        dish.name,
        quantity
      );

      setLastOrder(response.order);

      showNotification(
        `${quantity} × ${dish.name} ordered successfully`
      );
    } catch (error) {
      console.error("Order failed:", error);

      showNotification(
        "Order failed. Check that CloudBites backend is running."
      );
    } finally {
      setOrdering(false);
    }
  };

  /* =======================================================
     CHECKOUT CART
  ======================================================= */

  const checkoutCart = async () => {
    if (cart.length === 0 || ordering) return;

    try {
      setOrdering(true);

      for (const item of cart) {
        const response = await placeOrder(
          item.restaurant,
          item.name,
          item.quantity
        );

        setLastOrder(response.order);
      }

      setCart([]);
      setCartOpen(false);

      showNotification(
        "Your entire order has been sent to the kitchen."
      );
    } catch (error) {
      console.error("Checkout failed:", error);

      showNotification(
        "Checkout failed. Please check the backend."
      );
    } finally {
      setOrdering(false);
    }
  };

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredDishes = useMemo(() => {
    let result = dishes;

    if (selectedCategory) {
      result = result.filter(
        (dish) => dish.category === selectedCategory
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      result = result.filter(
        (dish) =>
          dish.name.toLowerCase().includes(query) ||
          dish.restaurant.toLowerCase().includes(query) ||
          dish.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [
    dishes,
    selectedCategory,
    searchQuery,
  ]);

  /* =======================================================
     CATEGORY
  ======================================================= */

  const selectCategory = (category: Category) => {
    setSelectedCategory((current) =>
      current === category ? null : category
    );

    window.setTimeout(() => {
      document
        .getElementById("popular")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 50);
  };

  /* =======================================================
     LOCATION
  ======================================================= */

  const changeLocation = () => {
    const locations = [
      "Hyderabad",
      "Guntur",
      "Vijayawada",
    ];

    const currentIndex =
      locations.indexOf(location);

    const nextLocation =
      locations[
        (currentIndex + 1) % locations.length
      ];

    setLocation(nextLocation);

    showNotification(
      `Delivery location: ${nextLocation}`
    );
  };

  /* =======================================================
     FRIDAY NIGHT DINNER RUSH
  ======================================================= */

  const simulateDinnerRush = async () => {
    if (rushRunning) return;

    setRushRunning(true);
    setRushOrders(0);

    showNotification(
      "Friday Night Dinner Rush started — watch Grafana."
    );

    const rushDishes = dishes.filter(
      (dish) =>
        dish.category === "Pizza" ||
        dish.category === "Burgers" ||
        dish.category === "Bowls"
    );

    /*
     * 30 batches × 20 concurrent requests.
     * This deliberately creates real backend traffic,
     * which Prometheus scrapes and sends to Azure.
     */
    for (let second = 0; second < 30; second++) {
      if (rushDishes.length === 0) break;

      const requests = Array.from(
        { length: 20 },
        (_, index) => {
          const dish =
            rushDishes[
              Math.floor(
                Math.random() * rushDishes.length
              )
            ];

          return placeOrder(
            dish.restaurant,
            dish.name,
            1
          ).catch((error) => {
            console.error(
              "Rush order failed:",
              error
            );
          });
        }
      );

      await Promise.allSettled(requests);

      setRushOrders((current) =>
        current + requests.length
      );

      await new Promise((resolve) =>
        window.setTimeout(resolve, 1000)
      );
    }

    setRushRunning(false);

    showNotification(
      "Friday Night Dinner Rush complete."
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="page">

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <header className="nav">

        <a href="/" className="wordmark">
          cloudkitchen
        </a>

        <nav className="nav-menu">
          <a href="#menu">Menu</a>
          <a href="#story">Our story</a>
          <a href="#delivery">Delivery</a>
        </nav>

        <div className="nav-actions">

          <button
            className="location"
            onClick={changeLocation}
          >
            <MapPin size={15} />
            {location}
          </button>

          <button
            className="icon-button"
            onClick={() =>
              setSearchOpen((current) => !current)
            }
            aria-label="Search menu"
          >
            <Search
              size={18}
              strokeWidth={1.7}
            />
          </button>

          <button
            className="icon-button bag"
            onClick={() => setCartOpen(true)}
            aria-label="Shopping bag"
          >
            <ShoppingBag
              size={18}
              strokeWidth={1.7}
            />
            <span>{cartCount}</span>
          </button>

        </div>
      </header>

      {/* =================================================
          SEARCH
      ================================================= */}

      {searchOpen && (
        <div
          style={{
            position: "fixed",
            top: "75px",
            right: "30px",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <Search size={17} />

          <input
            autoFocus
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search the menu..."
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              minWidth: "220px",
            }}
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* =================================================
          BACKEND STATUS
      ================================================= */}

      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "8px 12px",
          fontSize: "11px",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <Activity size={13} />

        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: backendOnline
              ? "#22c55e"
              : "#ef4444",
          }}
        />

        {backendOnline
          ? "CloudBites API online"
          : "Backend offline"}
      </div>

      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero">

        <div className="hero-photo" />

        <div className="hero-dark" />

        <div className="hero-inner">

          <motion.div
            className="hero-copy"
            initial={{
              opacity: 0,
              y: 35,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 1,
              ease: [0.22, 1, 0.36, 1],
            }}
          >

            <p className="hero-kicker">
              FOOD WORTH COMING BACK FOR
            </p>

            <h1>
              Made for
              <br />
              <i>your kind</i>
              <br />
              of hungry.
            </h1>

            <p className="hero-description">
              Honest ingredients, bold flavours and food made to
              disappear from the plate.
            </p>

            <div className="hero-actions">

              <a
                href="#menu"
                className="button-primary"
              >
                Explore the menu
                <ArrowRight size={17} />
              </a>

              <a
                href="#story"
                className="text-button"
              >
                Discover our kitchen
              </a>

            </div>
          </motion.div>

          <motion.div
            className="hero-side"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 1,
              delay: 0.4,
            }}
          >
            <span>SCROLL TO EXPLORE</span>
            <ArrowDown size={15} />
          </motion.div>

          <motion.div
            className="hero-note"
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.8,
              delay: 0.6,
            }}
          >
            <span>OPEN TODAY</span>
            <strong>11:00 — 23:30</strong>
          </motion.div>

        </div>
      </section>

      {/* =================================================
          INTRO
      ================================================= */}

      <section className="intro">

        <div className="intro-small">
          <span>01</span>
          <span>THE KITCHEN</span>
        </div>

        <div className="intro-main">

          <h2>
            We don't make
            <br />
            <i>complicated food.</i>
          </h2>

          <p>
            We make the kind you think about on the way home.
            Fresh produce, proper cooking and recipes that don't
            need an explanation.
          </p>

          <a
            href="#story"
            className="underlined-link"
          >
            More about us
            <ArrowRight size={15} />
          </a>

        </div>
      </section>

      {/* =================================================
          CATEGORIES
      ================================================= */}

      <section
        className="categories section-width"
        id="menu"
      >

        <div className="section-head">

          <div>
            <span className="section-number">
              02 / MENU
            </span>

            <h2>
              Something for everyone.
            </h2>
          </div>

          <a
            href="#popular"
            className="underlined-link"
            onClick={() =>
              setSelectedCategory(null)
            }
          >
            View full menu
            <ArrowRight size={15} />
          </a>

        </div>

        <div className="category-list">

          {categories.map((category, index) => (

            <motion.a
              href="#popular"
              className="category"
              key={category.name}
              onClick={(event) => {
                event.preventDefault();

                selectCategory(
                  category.name as Category
                );
              }}
              initial={{
                opacity: 0,
                y: 30,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                margin: "-80px",
              }}
              transition={{
                duration: 0.7,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            >

              <div className="category-image">
                <img
                  src={category.image}
                  alt={category.name}
                />
              </div>

              <div className="category-footer">

                <h3>{category.name}</h3>

                <span>
                  {selectedCategory ===
                  category.name
                    ? "Showing"
                    : "Explore"}

                  <ArrowRight size={15} />
                </span>

              </div>

            </motion.a>

          ))}

        </div>
      </section>

      {/* =================================================
          FEATURE DISH
      ================================================= */}

      <section
        className="feature-dish"
        id="popular"
      >

        <div className="feature-photo">
          <img
            src="https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=1800&q=90"
            alt="Signature burger"
          />
        </div>

        <div className="feature-copy">

          <span className="section-number">
            03 / THE FAVOURITE
          </span>

          <h2>
            The one
            <br />
            <i>everyone orders.</i>
          </h2>

          <p className="feature-description">
            Our house smash burger. Crisp edges, soft centre,
            aged cheddar and a sauce we've been quietly
            perfecting for a very long time.
          </p>

          <div className="feature-details">
            <span>House favourite</span>
            <span>
              {formatCurrency(
                dishes.find(
                  (dish) =>
                    dish.name ===
                    "Double Smash Burger"
                )?.price ?? 329
              )}
            </span>
          </div>

          <button
            className="button-primary dark-button"
            onClick={() => {
              const burger =
                dishes.find(
                  (dish) =>
                    dish.name ===
                    "Double Smash Burger"
                ) ?? fallbackDishes[5];

              addToCart(burger);
            }}
          >
            Add to order
            <Plus size={17} />
          </button>

        </div>
      </section>

      {/* =================================================
          POPULAR MENU
      ================================================= */}

      <section className="popular section-width">

        <div className="section-head">

          <div>
            <span className="section-number">
              04 / POPULAR
            </span>

            <h2>
              {selectedCategory
                ? `${selectedCategory} favourites.`
                : "Good choices, apparently."}
            </h2>
          </div>

          {selectedCategory && (
            <button
              className="underlined-link"
              onClick={() =>
                setSelectedCategory(null)
              }
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Clear filter
              <X size={15} />
            </button>
          )}

        </div>

        <div className="dish-list">

          {filteredDishes.map(
            (dish, index) => (

              <motion.article
                className="dish"
                key={`${dish.restaurant}-${dish.name}`}
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.1,
                }}
              >

                <div className="dish-photo">

                  <img
                    src={dish.image}
                    alt={dish.name}
                  />

                  <button
                    className="dish-add"
                    onClick={() =>
                      addToCart(dish)
                    }
                    aria-label={`Add ${dish.name}`}
                  >
                    <Plus
                      size={18}
                      strokeWidth={1.7}
                    />
                  </button>

                </div>

                <div className="dish-info">

                  <h3>{dish.name}</h3>

                  <p>{dish.description}</p>

                  <small
                    style={{
                      display: "block",
                      opacity: 0.55,
                      marginTop: "4px",
                    }}
                  >
                    {dish.restaurant}
                  </small>

                  <div className="dish-price">

                    <span>
                      {formatCurrency(
                        dish.price
                      )}
                    </span>

                    <span className="rating">
                      <Star
                        size={12}
                        fill="currentColor"
                      />
                      {dish.rating}
                    </span>

                  </div>

                </div>

              </motion.article>
            )
          )}

        </div>

        {filteredDishes.length === 0 && (
          <p
            style={{
              textAlign: "center",
              padding: "50px 0",
              opacity: 0.6,
            }}
          >
            No dishes found.
          </p>
        )}

      </section>

      {/* =================================================
          STORY
      ================================================= */}

      <section
        className="story"
        id="story"
      >

        <div className="story-image">
          <img
            src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=90"
            alt="Restaurant kitchen"
          />
        </div>

        <div className="story-copy">

          <span className="section-number">
            05 / OUR STORY
          </span>

          <h2>
            Small kitchen.
            <br />
            <i>Big appetite.</i>
          </h2>

          <p>
            CloudKitchen started with a simple idea: make
            restaurant-quality food feel effortless.
          </p>

          <p>
            No fuss. No unnecessary rules. Just good ingredients,
            thoughtful recipes and a kitchen that cares about
            what leaves its door.
          </p>

          <a
            href="#delivery"
            className="underlined-link"
          >
            How we deliver
            <ArrowRight size={15} />
          </a>

        </div>
      </section>

      {/* =================================================
          DELIVERY
      ================================================= */}

      <section
        className="delivery"
        id="delivery"
      >

        <div className="delivery-inner">

          <div>

            <span className="section-number">
              06 / DELIVERY
            </span>

            <h2>
              Still hot
              <br />
              <i>when it arrives.</i>
            </h2>

          </div>

          <div className="delivery-info">

            <p>
              From kitchen to doorstep, we keep the journey
              short and the process simple.
            </p>

            <div className="delivery-stats">

              <div>
                <Clock3 size={18} />
                <strong>25 min</strong>
                <span>average delivery</span>
              </div>

              <div>
                <Star size={18} />
                <strong>4.9 / 5</strong>
                <span>customer rating</span>
              </div>

            </div>

            <a
              href="#menu"
              className="button-primary"
            >
              Order something
              <ArrowRight size={17} />
            </a>

          </div>
        </div>
      </section>

      {/* =================================================
          AZURE / DEVOPS DEMO
      ================================================= */}

      <section
        className="section-width"
        style={{
          paddingTop: "80px",
          paddingBottom: "80px",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "30px",
            flexWrap: "wrap",
          }}
        >

          <div>

            <span className="section-number">
              AZURE / SYSTEM HEALTH
            </span>

            <h2>
              Real traffic.
              <br />
              <i>Real observability.</i>
            </h2>

            <p
              style={{
                maxWidth: "520px",
                opacity: 0.65,
              }}
            >
              CloudBites sends live application metrics through
              Prometheus into Azure Monitor and Azure Managed
              Grafana.
            </p>

          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >

            <button
              className="button-primary"
              onClick={simulateDinnerRush}
              disabled={rushRunning}
            >
              {rushRunning
                ? `Rush running · ${rushOrders}`
                : "Simulate Friday Night Dinner Rush"}

              <Activity size={17} />
            </button>

            <a
              href={GRAFANA_URL}
              target="_blank"
              rel="noreferrer"
              className="text-button"
            >
              Open Grafana
              <ArrowRight size={15} />
            </a>

          </div>

        </div>

        {lastOrder && (
          <div
            style={{
              marginTop: "30px",
              padding: "18px 20px",
              border: "1px solid rgba(0,0,0,0.12)",
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >

            <div>
              <span
                style={{
                  fontSize: "11px",
                  opacity: 0.5,
                }}
              >
                LAST BACKEND ORDER
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                }}
              >
                {lastOrder.item}
              </strong>
            </div>

            <div>
              <span
                style={{
                  fontSize: "11px",
                  opacity: 0.5,
                }}
              >
                RESTAURANT
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                }}
              >
                {lastOrder.restaurant}
              </strong>
            </div>

            <div>
              <span
                style={{
                  fontSize: "11px",
                  opacity: 0.5,
                }}
              >
                TOTAL
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                }}
              >
                {formatCurrency(
                  lastOrder.total
                )}
              </strong>
            </div>

            <div>
              <span
                style={{
                  fontSize: "11px",
                  opacity: 0.5,
                }}
              >
                PROCESSING
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "5px",
                }}
              >
                {lastOrder.processingTimeMs} ms
              </strong>
            </div>

          </div>
        )}

      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="footer">

        <div className="footer-top">

          <a
            href="/"
            className="wordmark"
          >
            cloudkitchen
          </a>

          <p>
            Food made properly.
            <br />
            Delivered simply.
          </p>

          <div className="footer-links">
            <a href="#menu">Menu</a>
            <a href="#story">Our story</a>
            <a href="#delivery">Delivery</a>
            <a
              href={GRAFANA_URL}
              target="_blank"
              rel="noreferrer"
            >
              System health
            </a>
          </div>

        </div>

        <div className="footer-bottom">

          <span>
            © 2026 CloudKitchen
          </span>

          <span>
            Powered by Azure
          </span>

        </div>

      </footer>

      {/* =================================================
          CART DRAWER
      ================================================= */}

      {cartOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.45)",
          }}
          onClick={() => setCartOpen(false)}
        >

          <aside
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: "100%",
              width: "min(440px, 92vw)",
              background: "#fff",
              padding: "30px",
              overflowY: "auto",
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "30px",
              }}
            >

              <div>
                <span
                  style={{
                    fontSize: "11px",
                    opacity: 0.5,
                  }}
                >
                  YOUR ORDER
                </span>

                <h2
                  style={{
                    margin: "5px 0 0",
                  }}
                >
                  Shopping bag
                </h2>
              </div>

              <button
                onClick={() =>
                  setCartOpen(false)
                }
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <X size={22} />
              </button>

            </div>

            {cart.length === 0 ? (

              <div
                style={{
                  padding: "50px 0",
                  textAlign: "center",
                  opacity: 0.6,
                }}
              >
                <ShoppingBag
                  size={32}
                  strokeWidth={1}
                />

                <p>
                  Your bag is empty.
                </p>

                <button
                  className="button-primary"
                  onClick={() =>
                    setCartOpen(false)
                  }
                >
                  Browse menu
                </button>
              </div>

            ) : (

              <>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >

                  {cart.map((item) => (

                    <div
                      key={`${item.restaurant}-${item.name}`}
                      style={{
                        display: "flex",
                        gap: "14px",
                        borderBottom:
                          "1px solid rgba(0,0,0,0.1)",
                        paddingBottom: "20px",
                      }}
                    >

                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                        }}
                      />

                      <div
                        style={{
                          flex: 1,
                        }}
                      >

                        <strong>
                          {item.name}
                        </strong>

                        <small
                          style={{
                            display: "block",
                            opacity: 0.5,
                            marginTop: "3px",
                          }}
                        >
                          {item.restaurant}
                        </small>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                              "space-between",
                            marginTop: "12px",
                          }}
                        >

                          <strong>
                            {formatCurrency(
                              item.price *
                                item.quantity
                            )}
                          </strong>

                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: "8px",
                            }}
                          >

                            <button
                              onClick={() =>
                                updateQuantity(
                                  item,
                                  item.quantity - 1
                                )
                              }
                              style={{
                                border:
                                  "1px solid rgba(0,0,0,0.15)",
                                background:
                                  "transparent",
                                width: "28px",
                                height: "28px",
                                cursor:
                                  "pointer",
                              }}
                            >
                              <Minus size={13} />
                            </button>

                            <span>
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                updateQuantity(
                                  item,
                                  item.quantity + 1
                                )
                              }
                              style={{
                                border:
                                  "1px solid rgba(0,0,0,0.15)",
                                background:
                                  "transparent",
                                width: "28px",
                                height: "28px",
                                cursor:
                                  "pointer",
                              }}
                            >
                              <Plus size={13} />
                            </button>

                          </div>

                        </div>

                      </div>

                      <button
                        onClick={() =>
                          removeFromCart(item)
                        }
                        style={{
                          alignSelf: "flex-start",
                          border: "none",
                          background:
                            "transparent",
                          cursor: "pointer",
                          opacity: 0.5,
                        }}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>

                    </div>

                  ))}

                </div>

                <div
                  style={{
                    marginTop: "30px",
                    paddingTop: "20px",
                    borderTop:
                      "1px solid rgba(0,0,0,0.15)",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      fontSize: "18px",
                      marginBottom: "18px",
                    }}
                  >
                    <span>Total</span>

                    <strong>
                      {formatCurrency(cartTotal)}
                    </strong>
                  </div>

                  <button
                    className="button-primary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                    }}
                    disabled={ordering}
                    onClick={checkoutCart}
                  >
                    {ordering
                      ? "Sending to kitchen..."
                      : "Place order"}

                    <ArrowRight size={17} />
                  </button>

                </div>

              </>

            )}

          </aside>

        </div>
      )}

      {/* =================================================
          NOTIFICATION
      ================================================= */}

      {notification && (
        <div
          style={{
            position: "fixed",
            top: "90px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
            background: "#111",
            color: "#fff",
            padding: "12px 18px",
            fontSize: "13px",
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.2)",
          }}
        >
          {notification}
        </div>
      )}

    </main>
  );
}

export default Home;