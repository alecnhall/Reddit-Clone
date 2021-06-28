import {MikroORM} from "@mikro-orm/core";
import { __prod__ } from "./constants";
import mikroConfig from "./mikro-orm.config";
import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import {buildSchema} from 'type-graphql';
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { MyContext } from "./types";
import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';


const main = async () => {
    const orm = await MikroORM.init(mikroConfig);
    orm.getMigrator().up();
    
    const app = express();

    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient();

    app.use(
        session({
            name: 'qid',
            store: new RedisStore({ 
                client: redisClient,
                disableTouch: true, // time to last ttl reduce number of request
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
                httpOnly: true, // you cannot acces the cookie in front end js code
                sameSite: 'lax', // csrf cross site request forgery
                secure: __prod__ // cookie only works in https
            },
            saveUninitialized: false,
            secret: "hejhfhkweuwieiooejfe83",
            resave: false
        })
    );

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
        context: ({ req, res }): MyContext => ({em: orm.em, req, res})
    });

    apolloServer.applyMiddleware({app});

    app.listen(4000, () => {
        console.log('server started on localhost:4000')
    })

}

main().catch(err => {
    console.log(err);
});