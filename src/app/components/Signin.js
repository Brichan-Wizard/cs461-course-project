import React, {Component} from "react";
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import {graphqlOperation} from "@aws-amplify/api-graphql";
import {API} from "@aws-amplify/api";
import {dataToUsers, userFullName} from "../Utilities";
import {MINIMUM_EMAIL_LENGTH, MINIMUM_PASSWORD_LENGTH} from "../Constants";
import {toast} from "react-toastify";
import {createSchoolUser, deleteSchoolUser} from "../../graphql/mutations";
import {listSchoolUsers} from "../../graphql/queries";


export default class Signin extends Component {

    constructor(props) {
        super(props);
        this.onSignin = this.onSignin.bind(this)
        this.closePopup = React.createRef()
    }

    hasUser() {
        return this.props.user != null
    }

    render() {
        return <>
            <p>{this.hasUser() ? (userFullName(this.props.user)) : "No one signed in"}</p>
            <p>{this.hasUser() ? this.props.user.email : ""}</p>
            <div className='verticalGroup'>
                <Popup className='vertical'
                       ref={this.closePopup} trigger={
                    <button>
                        {"Sign " + (this.hasUser() ? "out" : "in")}
                    </button>
                } position="right center"
                       onOpen={e => this.onSigninClick()}>
                    {this.getSignInDialog()}
                </Popup>

                <button onClick={() => this.debugCreateUser()}>Create user</button>
                <button onClick={() => this.debugDeleteUser()}>Delete user</button>
                <button onClick={() => this.debugGetUsers()}>Get users</button>
            </div>
        </>
    }

    onSigninClick() {
        console.log('onSigninClick')
        if (this.hasUser()) {
            console.log(`Signing out`)
            this.onSignin(null)
            return true
        }
    }

    getSignInDialog() {
        if (this.hasUser()) {
            return null
        }
        const email = React.createRef()
        const passwordRef = React.createRef()
        return <div>
            <label htmlFor="email">Email: </label>
            <input ref={email} id="email"/>

            <label htmlFor="password">Password: </label>
            <input ref={passwordRef} id="password"/>

            <button onClick={() =>
                this.onTrySignin(email.current.value, passwordRef.current.value, this.onSignin)}>
                Sign in
            </button>
        </div>
    }


    checkTooShort(value, title, exp) {
        if (value.length < exp) {
            toast.info(`${title} too short, must be ${exp} characters long, was ${value.length}`)
            return true
        }
        return false
    }

    onTrySignin(email, password, onSignin) {
        console.log('Calling onTrySignin')

        const bad = () => toast.error("Cannot get users right now... try again later")

        if (this.checkTooShort(email, "Email", MINIMUM_EMAIL_LENGTH))
            return
        if (this.checkTooShort(password, "Password", MINIMUM_PASSWORD_LENGTH))
            return

        //listSchoolUsersNoPassword
        API.graphql(graphqlOperation(listSchoolUsers, {
            filter: {
                email: {
                    eq: email
                }
            }
        })).then(function (data) {
            const users = dataToUsers(data)
            const l = users.length
            console.log(`Amount of users with email: ${l}`)
            if (l <= 0) {
                toast.error("Invalid email")
            } else if (l === 1) {
                API.graphql(graphqlOperation(listSchoolUsers, {
                    filter: {
                        email: {
                            eq: email
                        },
                        passwrd: {
                            eq: password
                        }
                    }
                })).then(function (data) {
                    const user = dataToUsers(data)[0]
                    if (user) {
                        onSignin(user)
                    } else {
                        toast.error("Invalid password")
                    }
                }).catch(function (error) {
                    bad()
                    console.error("Inner query with passwrd", error)
                })
            } else if (l > 1) {
                toast.error("Too many users for email!")
            }
        }).catch(function (err) {
            bad()
            console.error(`Could not get users: `, err)
        })

    }

    onSignin(user) {
        this.props.setUser(user)
        this.closePopup.current.close()
    }

    debugDeleteUser() {
        API.graphql(graphqlOperation(listSchoolUsers))
            .then(function (data) {
                const users = dataToUsers(data)
                console.log('users', users)
                for (let user of users) {
                    API.graphql(graphqlOperation(deleteSchoolUser, {
                        input: {
                            id: user.id
                        }
                    })).then(() => console.log('bye user'))
                        .catch((err) => console.error('not bye user', err))
                }
            })
            .catch(function (err) {
                console.error('could not delete school users', err)
            })
    }

    debugGetUsers() {
        API.graphql(graphqlOperation(listSchoolUsers))
            .then(function (data) {
                const users = dataToUsers(data)
                console.log('got users', users)
            })
            .catch((error) => console.error('Could not get school users', error))
    }

    debugCreateUser() {
        API.graphql(graphqlOperation(createSchoolUser, {
            input: {
                first_name: "Dan",
                last_name: "Brichan",
                email: "bric9031@ku.edu",
                passwrd: "not secure",
                user_type: "REGISTRAR"
            }
        })).then(function (data) {
            toast.info('New user saved')
        })
            .catch(function (err) {
                toast.error("Could not save user")
                console.error("Could not save user", err)
            })
    }
}