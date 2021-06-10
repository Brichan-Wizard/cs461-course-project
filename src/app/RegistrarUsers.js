import React from "react";
import {createPassword, displayError} from "./Utilities";
import {API} from "@aws-amplify/api";
import {graphqlOperation} from "@aws-amplify/api-graphql";
import {listSchoolUsers} from "../graphql/queries";
import {createSchoolUser, deleteSchoolUser, updateSchoolUser} from "../graphql/mutations";
import {toast} from "react-toastify";
import {RegistrarOptions} from "./Options";


export function createUserPopup(context, popupRef) {
    const email = React.createRef()
    const fname = React.createRef()
    const lname = React.createRef()
    const user_type = React.createRef()
    return <>
        <div>
            <label htmlFor="email">Email: </label>
            <input ref={email} id="email"/>

            <label htmlFor="fname">First name: </label>
            <input ref={fname} id="fname"/>


            <label htmlFor="lname">Last name: </label>
            <input ref={lname} id="lname"/>

            <label htmlFor="user_type">User type: </label>
            <select ref={user_type} id="user_type">
                <option value="REGISTRAR">Registrar</option>
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
            </select>

        </div>
        <button onClick={function () {
            const current = popupRef.current
            createUser(context, email.current.value,
                fname.current.value,
                lname.current.value,
                user_type.current.value).then(function (result) {
                if (result === true) {
                    //for whatever reason, popup null in here
                    current.close()
                }
            })
        }
        }
        >Submit
        </button>
    </>
}

export async function createUser(context, email, first, last, user_type) {
    try {
        if (email === '' || first === '' || last === '') {
            displayError("Field(s) too short!")
            return false
        }
        const response = await API.graphql(graphqlOperation(listSchoolUsers, {
            filter: {
                email: {
                    eq: email
                }
            }
        }))
        if (response.data.listSchoolUsers.items.length > 0) {
            displayError("User already exists with that email!")
            return false
        }
        const data = await API.graphql(graphqlOperation(createSchoolUser, {
            input: {
                email: email,
                first_name: first,
                last_name: last,
                user_type: user_type,
                passwrd: createPassword()
            }
        }))
        const user = data.data.createSchoolUser
        console.log('New user:', user)
        registrarShowUsers(context)
        alert(`Password is ${user.passwrd}`)
        return true
    } catch (error) {
        displayError("Could not generate user", error)
    }
    return false
}

export function createNewPassword(rowData, context) {
    const randomPassword = createPassword()
    API.graphql(graphqlOperation(updateSchoolUser, {
        input: {
            id: rowData.id,
            passwrd: randomPassword
        }
    })).then(function () {
        registrarShowUsers(context)
        alert(`Password updated: ${randomPassword}`)
    }).catch(function (error) {
        displayError('Cannot update password', error)
    })
}
//edit users with hopefully a popup
export function editUser(rowData, context){
    const fname = React.createRef()
    const lname = React.createRef()
    const email = React.createRef()
    return<>
        <div>
            <label>First Name</label>
            <input ref={fname} id="fname"/>

            <label>Last Name</label>
            <input ref={lname} id="lname"/>

            <label>Email</label>
            <input ref={email} id="email"/>

            <button onClick={() =>this.changeUser(rowData, context, fname.current.value, lname.current.value, email.current.value)}>Change</button>
        </div>
    </>
}

export async function changeUser(rowData, context, fname, lname, email){
    if(fname !== ''){
        API.graphql(graphqlOperation(updateSchoolUser, {
            input: {
                fname: rowData.first_name
            }
        }))
    }
    if(lname !== ''){
        API.graphql(graphqlOperation(updateSchoolUser, {
            input: {
                lname: rowData.last_name
            }
        }))
    }
    if(email !== ''){
        API.graphql(graphqlOperation(updateSchoolUser, {
            input: {
                email: rowData.email
            }
        }))
    }
}

export function deleteUser(rowData, context) {
    API.graphql(graphqlOperation(deleteSchoolUser, {
        input: {
            id: rowData.id
        }
    })).then(function () {
        toast.info("User deleted")
        registrarShowUsers(context)
    }).catch(function (error) {
        displayError("Could not delete user", error)
    })
}

export function registrarShowUsers(context, setOption = true) {
    if (setOption)
        context.setState({registrarOptions: RegistrarOptions.EDIT_USERS, data: []})
    API.graphql(graphqlOperation(listSchoolUsers))
        .then(function (data) {
            const users = data.data.listSchoolUsers.items
            context.setState({data: users})
        })
        .catch(function (error) {
            displayError("Cannot load users", error)
        })
}