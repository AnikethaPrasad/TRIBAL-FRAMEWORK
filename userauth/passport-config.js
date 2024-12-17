const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

async function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUsers = async (email, password, done) => {
        try {
            // Use await to properly resolve the Promise returned by getUserByEmail
            const user = await getUserByEmail(email);

            if (user == null) {
                return done(null, false, { message: "No user found with that email" });
            }

            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false, { message: "Password Incorrect" });
            }
        } catch (e) {
            console.error(e);
            return done(e);
        }
    };

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUsers));

    passport.serializeUser((user, done) => done(null, user.id));
    
    passport.deserializeUser(async (id, done) => {
        // Use await to properly resolve the Promise returned by getUserById
        const user = await getUserById(id);
        return done(null, user);
    });
}

module.exports = initialize;
