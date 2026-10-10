const express = require("express");
const cors = require("cors");
const client = require("prom-client");

const app = express();

/*
 * Azure App Service / Container platforms provide PORT.
 * Locally we default to 4000.
 */
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/* =========================================================
   PROMETHEUS REGISTRY
   ========================================================= */

const register = new client.Registry();

client.collectDefaultMetrics({
    register,
    prefix: "cloudbites_"
});


/* =========================================================
   CUSTOM BUSINESS METRICS
   ========================================================= */

const ordersTotal = new client.Counter({
    name: "cloudbites_orders_total",
    help: "Total number of food orders processed",
    labelNames: ["restaurant", "item", "status"],
    registers: [register]
});


/*
 * DEMO ORDER COUNTER
 *
 * Unlike cloudbites_orders_total, this resets to 0
 * whenever the backend restarts.
 *
 * This is useful for the hackathon live demo.
 */
const demoOrdersTotal = new client.Gauge({
    name: "cloudbites_demo_orders_total",
    help: "Current demo order count since backend startup",
    registers: [register]
});


const orderLatency = new client.Histogram({
    name: "cloudbites_order_duration_seconds",
    help: "Food order processing duration in seconds",
    labelNames: ["restaurant", "item"],
    buckets: [
        0.01,
        0.025,
        0.05,
        0.1,
        0.25,
        0.5,
        1,
        2,
        5
    ],
    registers: [register]
});


const orderErrors = new client.Counter({
    name: "cloudbites_order_errors_total",
    help: "Total number of failed food orders",
    labelNames: ["restaurant", "item"],
    registers: [register]
});


const activeOrders = new client.Gauge({
    name: "cloudbites_active_orders",
    help: "Number of food orders currently being processed",
    registers: [register]
});


/* =========================================================
   HTTP / APPLICATION METRICS
   ========================================================= */

const httpRequestsTotal = new client.Counter({
    name: "cloudbites_http_requests_total",
    help: "Total HTTP requests received",
    labelNames: ["method", "route", "status"],
    registers: [register]
});


const httpRequestDuration = new client.Histogram({
    name: "cloudbites_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route"],
    buckets: [
        0.005,
        0.01,
        0.025,
        0.05,
        0.1,
        0.25,
        0.5,
        1,
        2,
        5
    ],
    registers: [register]
});


/* =========================================================
   HTTP METRICS MIDDLEWARE
   ========================================================= */

app.use((req, res, next) => {

    const start = process.hrtime.bigint();

    res.on("finish", () => {

        const duration =
            Number(process.hrtime.bigint() - start) / 1_000_000_000;

        /*
         * Use the route pattern rather than arbitrary URLs.
         * This prevents Prometheus cardinality explosions.
         */
        const route = req.route?.path || req.path;

        httpRequestsTotal.inc({
            method: req.method,
            route,
            status: String(res.statusCode)
        });

        httpRequestDuration.observe(
            {
                method: req.method,
                route
            },
            duration
        );
    });

    next();
});


/* =========================================================
   CLOUDKITCHEN MENU DATA
   ========================================================= */

const restaurants = {

    "Pizza Palace": {
        "Margherita Pizza": 299,
        "Farmhouse Pizza": 399,
        "Cheese Burst Pizza": 449
    },

    "Burger House": {
        "Cheeseburger": 249,
        "Chicken Burger": 279,
        "Double Smash Burger": 329
    },

    "Bowl Factory": {
        "Teriyaki Chicken Bowl": 349,
        "Paneer Power Bowl": 299,
        "Asian Veggie Bowl": 279
    }

};


/* =========================================================
   ROOT
   ========================================================= */

app.get("/", (req, res) => {

    res.json({
        application: "CloudBites",
        status: "running",
        environment: process.env.NODE_ENV || "development",
        message: "CloudBites backend is running",
        endpoints: {
            health: "GET /health",
            restaurants: "GET /api/restaurants",
            order: "POST /api/order",
            metrics: "GET /metrics"
        }
    });

});


/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get("/health", (req, res) => {

    res.status(200).json({
        status: "healthy",
        service: "cloudbites-backend",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });

});


/* =========================================================
   RESTAURANT / MENU API
   ========================================================= */

app.get("/api/restaurants", (req, res) => {

    res.json({
        success: true,
        restaurants
    });

});


/* =========================================================
   ORDER API
   ========================================================= */

app.post("/api/order", async (req, res) => {

    const start = process.hrtime.bigint();

    const {
        restaurant,
        item,
        quantity = 1
    } = req.body;

    /*
     * Track currently processing orders.
     */
    activeOrders.inc();

    try {

        /* ---------------------------------------------
           Validation
        --------------------------------------------- */

        if (!restaurant || !item) {

            throw new Error(
                "restaurant and item are required"
            );

        }


        if (!restaurants[restaurant]) {

            throw new Error(
                "Restaurant not found"
            );

        }


        if (!restaurants[restaurant][item]) {

            throw new Error(
                "Item not found"
            );

        }


        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 20
        ) {

            throw new Error(
                "Quantity must be between 1 and 20"
            );

        }


        /* ---------------------------------------------
           Simulated order processing
        --------------------------------------------- */

        const processingDelay =
            30 + Math.floor(Math.random() * 70);

        await new Promise(resolve =>
            setTimeout(resolve, processingDelay)
        );


        /* ---------------------------------------------
           Calculate order
        --------------------------------------------- */

        const unitPrice =
            restaurants[restaurant][item];

        const total =
            unitPrice * quantity;


        /* ---------------------------------------------
           Record SUCCESS metrics
        --------------------------------------------- */

        ordersTotal.inc({
            restaurant,
            item,
            status: "success"
        });


        /*
         * Increment the demo-only gauge.
         *
         * This starts at 0 every time Node.js starts,
         * so Grafana can show a clean demo count.
         */
        demoOrdersTotal.inc();


        const duration =
            Number(process.hrtime.bigint() - start) /
            1_000_000_000;


        orderLatency.observe(
            {
                restaurant,
                item
            },
            duration
        );


        /* ---------------------------------------------
           Response
        --------------------------------------------- */

        res.status(201).json({

            success: true,

            message: "Order placed successfully",

            order: {
                restaurant,
                item,
                quantity,
                unitPrice,
                total
            },

            processingTimeMs:
                Math.round(duration * 1000)

        });

    } catch (error) {

        /* ---------------------------------------------
           Record ERROR metrics
        --------------------------------------------- */

        orderErrors.inc({

            restaurant:
                restaurants[restaurant]
                    ? restaurant
                    : "unknown",

            item:
                restaurants[restaurant]?.[item]
                    ? item
                    : "unknown"

        });


        ordersTotal.inc({

            restaurant:
                restaurants[restaurant]
                    ? restaurant
                    : "unknown",

            item:
                restaurants[restaurant]?.[item]
                    ? item
                    : "unknown",

            status: "error"

        });


        res.status(400).json({

            success: false,

            message: error.message

        });

    } finally {

        activeOrders.dec();

    }

});


/* =========================================================
   PROMETHEUS METRICS ENDPOINT
   ========================================================= */

app.get("/metrics", async (req, res) => {

    try {

        res.set(
            "Content-Type",
            register.contentType
        );

        const metrics =
            await register.metrics();

        res.end(metrics);

    } catch (error) {

        console.error(
            "Prometheus metrics error:",
            error
        );

        res
            .status(500)
            .send("Unable to collect metrics");

    }

});


/* =========================================================
   404 HANDLER
   ========================================================= */

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Endpoint not found",

        path: req.path

    });

});


/* =========================================================
   START SERVER
   ========================================================= */

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("        CLOUDBITES BACKEND");
    console.log("======================================");
    console.log(`Server:    http://localhost:${PORT}`);
    console.log("");
    console.log("Health:    GET  /health");
    console.log("Menu:      GET  /api/restaurants");
    console.log("Order:     POST /api/order");
    console.log("Metrics:   GET  /metrics");
    console.log("======================================");
    console.log("");

});