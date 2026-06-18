const router = require("express").Router();
const authRouter = require("./authRouter");
const profileRouter = require("./profileRouter");
const gymRouter = require("./gymRouter");

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/gym", gymRouter);

module.exports = router;
