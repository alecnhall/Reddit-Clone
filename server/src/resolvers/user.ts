import { User } from '../entities/User';
import { MyContext } from 'src/types';
import {Resolver, Mutation, Arg, InputType, Field, Ctx, ObjectType} from 'type-graphql';
import argon2 from 'argon2';

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string;
    @Field()
    password: string;
}

@ObjectType()
class Error {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [Error], {nullable: true})
    errors?: Error[];

    @Field(() => User, {nullable: true})
    user?: User;
}

@Resolver()
export class UserResolver {
    @Mutation(() => UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em}: MyContext
    ): Promise<UserResponse> {
        if(options.username.length <= 2) {
            return {
                errors: [
                    {
                        field: "username",
                        message: "length must be greater than 2"
                    }
                ]
            };
        }
        if(options.password.length <= 3) {
            return {
                errors: [
                    {
                        field: "password",
                        message: "length must be greate than 3"
                    }
                ]
            }
        }
        const hashedPassword = await argon2.hash(options.password)
        const user = em.create(User, {
            username: options.username, 
            password: hashedPassword
        });
        try {
            await em.persistAndFlush(user);
        } catch (error) {
            if(error.code === '23505' || error.detail.includes("already exists")) {
                return {
                    errors: [
                        {
                            field: "username",
                            message: "username already exists"
                        }
                    ]
                }
            }
            console.log(error.message);
        }
        
        return {user};
    }

    @Mutation(() => UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em, req}: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, {username: options.username});
        if(!user) {
            return {
                errors: [
                    {
                    field: "Username",
                    message: "Username does not exist"
                }
            ]
            }
        }
        const valid = await argon2.verify(user.password,options.password)
        if (!valid) {
            return {
                errors: [
                    {
                        field: "Password",
                        message: "Incorrect Password"
                    }
                ]
            }
        }

        req.session.userId = user.id;

        return {user};
    }
}