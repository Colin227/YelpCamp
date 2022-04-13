const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const { campgroundSchema } = require("./schemas.js")
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/ExpressError");
const Campground = require("./models/campground");
const methodOverride = require("method-override");

// Connect mongoose to mongoDB
mongoose.connect("mongodb://127.0.0.1:27017/yelp-camp");
const db = mongoose.connection;
// Error handling for database connection errors
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database Connected!");
});

const app = express();
// EJS templating 
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
// Method overriding to use HTTP methods (PUT/DELETE) where client does not support them.
app.use(methodOverride("_method"));


// Campground Schema validation middleware
const validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if(error){
        // Map over error details to make single string message.
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}


app.get("/", (req, res) => {
    res.render("home");
});
// List all campgrounds
app.get(
    "/campgrounds",
    catchAsync(async (req, res) => {
        const campgrounds = await Campground.find({});
        res.render("campgrounds/index", { campgrounds });
    })
);

// New campground creation form
app.get("/campgrounds/new", (req, res) => {
    res.render("campgrounds/new");
});


// Creating a new campground
app.post(
    "/campgrounds",
    validateCampground,
    catchAsync(async (req, res, next) => {
        const campground = new Campground(req.body.campground);
        await campground.save();
        res.redirect(`/campgrounds/${campground._id}`);
    }));

// Show individual campground details
app.get(
    "/campgrounds/:id",
    catchAsync(async (req, res) => {
        const campground = await Campground.findById(req.params.id);
        res.render("campgrounds/show", { campground });
    })
);

// Editing campground form
app.get(
    "/campgrounds/:id/edit",
    catchAsync(async (req, res) => {
        const campground = await Campground.findById(req.params.id);
        res.render("campgrounds/edit", { campground });
    })
);

// Editing an individual campground
app.put(
    "/campgrounds/:id",
    validateCampground,
    catchAsync(async (req, res) => {
        const { id } = req.params;
        const campground = await Campground.findByIdAndUpdate(id, {
            ...req.body.campground,
        });
        res.redirect(`/campgrounds/${campground._id}`);
    })
);

// Deleting campground
app.delete(
    "/campgrounds/:id",
    catchAsync(async (req, res) => {
        const { id } = req.params;
        await Campground.findByIdAndDelete(id);
        res.redirect("/campgrounds");
    })
);

// 404 handling if URL is not found
app.all("*", (req, res, next) => {
    next(new ExpressError("Page not found", 404));
});

// Default Error handling template
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if(!err.message) err.message = "Oh no, something went wrong."
    res.status(statusCode).render('error', { err })
});

app.listen(3000, () => {
    console.log("LISTENING ON PORT 3000");
});
