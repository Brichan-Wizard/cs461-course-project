/* eslint-disable default-case */
import React, {Component} from "react";
import MaterialTable from "material-table";
import {getDepartment, listCourseReports, listCourses, listDepartments, listSchoolUsers} from "../../graphql/queries";
import {graphqlOperation} from "@aws-amplify/api-graphql";
import {API} from "@aws-amplify/api";
import {toast} from "react-toastify";
import {ActionIcon} from "./ActionIcon";
import {
    createDepartment,
    createSchoolUser,
    createCourse,
    deleteDepartment,
    deleteSchoolUser, 
    updateDepartment,
    updateSchoolUser
} from "../../graphql/mutations";
import {getRandomInt, userType} from "../Utilities";
import Popup from "reactjs-popup";


//Enums for different views (like showing classes, previous course reports, blah blah blah)
const StudentOptions = {
    SHOW_CLASSES: 0,
    SHOW_COURSE_REPORTS: 1,
}
const InstructorOptions = {
    DEFAULT_OPTION: 0
}
const RegistrarOptions = {
    EDIT_USERS: 0,
    VIEW_DEPARTMENTS: 1,
    ASSIGN_HEAD_STEP_1: 2,
    ASSIGN_HEAD_STEP_2: 3,
    CREATE_COURSE: 4
}

export default class DataPage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            data: [{value: "yes"}],
            studentOption: StudentOptions.SHOW_CLASSES,
            instructorOptions: InstructorOptions.DEFAULT_OPTION,
            registrarOptions: RegistrarOptions.EDIT_USERS,
            department_to_head: null,
        }
    }

    /**
     * Coverts usertype and current option to list of column values
     * @returns {{field: string, title: string}[]|*[]}
     */
    getColumnsForType() {
        switch (this.userType()) {
            case "Student": {
                switch (this.state.studentOption) {
                    case StudentOptions.SHOW_CLASSES:
                    case StudentOptions.SHOW_COURSE_REPORTS:
                }
                break;
            }
            case "Registrar": {
                switch (this.state.registrarOptions) {
                    case RegistrarOptions.ASSIGN_HEAD_STEP_2:
                    case RegistrarOptions.EDIT_USERS: {
                        return [{title: 'User Type', field: 'user_type'},
                            {title: 'ID', field: 'id'},
                            {title: 'Email', field: 'email'},
                            {title: 'First Name', field: 'first_name'},
                            {title: 'Last Name', field: 'last_name'},
                            // {title: 'Password', field: 'passwrd'}
                        ]
                    }
                    case RegistrarOptions.ASSIGN_HEAD_STEP_1: //intended fall through
                    case RegistrarOptions.VIEW_DEPARTMENTS: {
                        return [{title: 'Department name', field: 'name'},
                            {title: "Head instructor", field: 'head_name'}]
                    }
                    case RegistrarOptions.CREATE_COURSE:
                }
                break;
            }
        }
        return []
    }

    /**
     * Converts usertype and current option to list of actions that can be clicked for each row
     * @returns {{onClick: (function(*, *): void), icon: (function()), tooltip: string}[]|*[]}
     */
    getActionsForType() {
        const here = this
        switch (this.userType()) {
            case "Student": {
                switch (this.state.studentOption) {
                    case StudentOptions.SHOW_CLASSES:
                        return []
                }
                break;
            }
            case "Registrar": {
                switch (this.state.registrarOptions) {
                    case RegistrarOptions.EDIT_USERS:
                        return [{
                            icon: () => <ActionIcon text="Rst Pswd"/>,
                            tooltip: "Reset password",
                            onClick: (event, rowData) => this.createNewPassword(rowData, this)
                        }, {
                            icon: () => <ActionIcon text="Del"/>,
                            tooltip: "Delete user",
                            onClick: (event, rowData) => this.deleteUser(rowData, this)
                        }]
                    case RegistrarOptions.VIEW_DEPARTMENTS: {
                        return [{
                            icon: () => <ActionIcon text="Del"/>,
                            tooltip: "Delete department",
                            onClick: (event, rowData) => this.deleteDepartment(rowData, this)
                        }]
                    }
                    case RegistrarOptions.ASSIGN_HEAD_STEP_1: {
                        return [{
                            icon: () => <ActionIcon text="Select"/>,
                            tooltip: "Select department",
                            onClick: function (e, row) {
                                here.registrarShowUsers(here, false)
                                here.setState({
                                    registrarOptions: RegistrarOptions.ASSIGN_HEAD_STEP_2,
                                    department_to_head: row
                                })
                            }
                        }]
                    }
                    case RegistrarOptions.ASSIGN_HEAD_STEP_2: {
                        return [{
                            icon: () => <ActionIcon text="Select"/>,
                            tooltip: "Select instructor",
                            onClick: (e, row) => here.assignDepartmentHead(here, here.state.department_to_head, row)
                        }]
                    }

                }
                break;
            }
            case "Instructor": {
                switch (this.state.instructorOptions) {

                }
            }

        }
        return []
    }

    assignDepartmentHead(context, department, user) {
        if (user.user_type === 'INSTRUCTOR') {
            API.graphql(graphqlOperation(updateDepartment, {
                input: {
                    id: department.id,
                    departmentHeadId: user.id
                }
            })).then(function () {
                toast.info("Updated")
                context.registrarAssignDepartmentHead(context)
            }).catch(function (error) {
                const m = "Cannot update head instructor"
                toast.error(m)
                console.error(m, error)
            })
        } else {
            toast.error(`You can't make a ${userType(user)} a head instructor!`)
        }
    }


    deleteDepartment(rowData, context) {
        API.graphql(graphqlOperation(deleteDepartment, {
            input: {
                id: rowData.id
            }
        })).then(function () {
            toast.info("Department deleted")
            context.registrarShowDepartments(context)
        }).catch(function (error) {
            const m = "Could not delete department"
            toast.error(m)
            console.error(m, error)
        })
    }

    deleteUser(rowData, context) {
        API.graphql(graphqlOperation(deleteSchoolUser, {
            input: {
                id: rowData.id
            }
        })).then(function () {
            toast.info("User deleted")
            context.registrarShowUsers(context)
        }).catch(function (error) {
            const m = "Could not delete user"
            toast.error(m)
            console.error(m, error)
        })
    }


    createNewPassword(rowData, context) {
        const randomPassword = this.createPassword()
        API.graphql(graphqlOperation(updateSchoolUser, {
            input: {
                id: rowData.id,
                passwrd: randomPassword
            }
        })).then(function () {
            context.registrarShowUsers(context)
            alert(`Password updated: ${randomPassword}`)
        }).catch(function (error) {
            let m = 'Cannot update password';
            toast.error(m)
            console.error(m, error)
        })
    }

    createPassword() {
        return getRandomInt(100_000_000).toString();
    }

    /**
     * Get user_type from user property as string
     * @returns {string|null}
     */
    userType() {
        const u = this.props.user
        return userType(u)
    }

    /**
     * Gets buttons that are shown for each user type
     */
    buttonsForType() {
        let buttons = []
        const here = this
        switch (this.userType()) {
            case "Student": {
                buttons = [{
                    title: "Show classes", onClick: () => this.studentShowClasses(here)
                }, {
                    title: "Show course reports", onClick: () => this.studentShowCourseReports(here)
                }]
                break;
            }
            case "Registrar": {
                buttons = [{
                    title: "Show users", onClick: () => this.registrarShowUsers(here)
                }, {
                    title: "Create user",
                    popup: this.popupHelper('createUserPopup',
                        'Create user',
                        // here.createUserPopup
                        (ref) => here.createUserPopup(here, ref))
                },{
                    title: "Create department",
                    popup: this.popupHelper('createDepartmentPopup',
                        'Create department',
                        (ref) => this.createDepartmentPopup(here, ref))
                },{
                    title: "Show departments", onClick: () => this.registrarShowDepartments(here)
                },{
                    title: "Assign department head", onClick: () => this.registrarAssignDepartmentHead(here)
                },{
                    title: "Create Course", 
                    popup: this.popupHelper('createNewCoursePopup', 
                            'Create Course', 
                            (ref) => this.createNewCoursePopup(here, ref))
                }]
                break;
            }
            case "Instructor" : {
                buttons = []
                break;
            }
        }
        return buttons.map(this.makeButton)
    }

    popupHelper(key, text, method) {
        const ref = React.createRef()
        return <Popup ref={ref} className='vertical'
                      key={key} trigger={
            <button>{text}</button>
        } position="right center">
            {
                method(ref)
            }
        </Popup>
    }

    registrarAssignDepartmentHead(context) {
        context.setState({registrarOptions: RegistrarOptions.ASSIGN_HEAD_STEP_1})
        context.registrarShowDepartments(context, false)
    }


    createDepartmentPopup(context, popupRef) {
        const name = React.createRef()
        return <div>
            <label htmlFor="name">Department name: </label>
            <input ref={name} id="name"/>
            <button onClick={async function () {
                const current = popupRef.current
                if (await context.createDepartment(context, name.current.value) === true) {
                    current.close()
                }
            }}
            >Submit
            </button>
        </div>
    }

    async createDepartment(context, name) {
        try {
            if (name === '') {
                toast.error("Department name cannot be empty!")
                return false
            }
            const response = await API.graphql(graphqlOperation(listDepartments, {
                filter: {
                    name: {
                        eq: name
                    }
                }
            }))
            console.log('response', response)

            if (response.data.listDepartments.items.length > 0) {
                toast.error("Department already exists with that name")
                return false
            }
            await API.graphql(graphqlOperation(createDepartment, {
                input: {
                    name: name
                }
            }))
            toast.info(`${name} department created`)
            context.registrarShowDepartments(context)
            return true
        } catch (error) {
            const m = "Could not create department"
            toast.error(m)
            console.error(m, error)
            return false
        }
        return false
    }

    createUserPopup(context, popupRef) {
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
                context.createUser(context, email.current.value,
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

    async createUser(context, email, first, last, user_type) {
        try {
            if (email === '' || first === '' || last === '') {
                toast.error("Field(s) too short!")
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
                toast.error("User already exists with that email!")
                return false
            }
            const data = await API.graphql(graphqlOperation(createSchoolUser, {
                input: {
                    email: email,
                    first_name: first,
                    last_name: last,
                    user_type: user_type,
                    passwrd: this.createPassword()
                }
            }))
            const user = data.data.createSchoolUser
            console.log('New user:', user)
            context.registrarShowUsers(context)
            alert(`Password is ${user.passwrd}`)
            return true
        } catch (error) {
            const m = "Could not generate user"
            console.error(m, error)
            toast.error(m)
        }
        return false
    }

    registrarShowUsers(context, setOption = true) {
        if (setOption)
            context.setState({registrarOptions: RegistrarOptions.EDIT_USERS, data: []})
        API.graphql(graphqlOperation(listSchoolUsers))
            .then(function (data) {
                const users = data.data.listSchoolUsers.items
                context.setState({data: users})
            })
            .catch(function (error) {
                let m = "Cannot load users";
                toast.error(m)
                console.error(m, error)
            })
    }

    //something about the department field not being accepted by the API
    //error: "The variables input contains a field name 'department' that is not defined for input object type 'CreateCourseInput' "
    createNewCoursePopup(context, popupRef){
        const id = React.createRef() 
        const section = React.createRef()
        const name = React.createRef()
        const credit_hours = React.createRef()
        const did = React.createRef()
        const instructor = React.createRef()
        return<>
            
                <label htmlFor="id">Course ID: </label>
                <input ref={id} id="id"/>

                <label htmlFor="section">Section Number: </label>
                <input ref={section} id="section"/>

                <label htmlFor="name">Name: </label>
                <input ref={name} id="name"/>

                <label htmlFor="credit_hours">Credit Hours: </label>
                <input ref={credit_hours} id="credit_hours"/>

                <label htmlFor="did">Department: </label>
                <select ref={did} id="did">
                    <option value="3764be10-1704-415a-8d14-9425ca992fe0">Physics</option>
                    <option value="6229d847-adae-40ab-9e61-7092b3b89eaa">Mathematics</option>
                </select>
                
                <label htmlFor="instructor">Instructor: </label>
                <select ref={instructor} id="instructor">
                    <option value="7a63b46e-793a-40dd-a83b-0b329224ef95">Jim</option>
                    <option value="2">Bob</option>
                </select>

            <button onClick={async function () {
                const current = popupRef.current
                context.createNewCourse(context, 
                    id.current.value,
                    section.current.value,
                    name.current.value,
                    credit_hours.current.value,
                    did.current.value,
                    instructor.current.value).then(function (result) {
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

    async createNewCourse(context, id, section, name, credit_hours, did, instructor){
        try{
            const response = await API.graphql(graphqlOperation(listCourses, {
                filter: {
                    id: {
                        eq: id
                    }
                }
            }))
            if (response.data.listCourses.items.length > 0) {
                toast.error("Course already exists")
                return false
            }
            const data = await API.graphql(graphqlOperation(createCourse, {
                input: {
                    id: id,
                    section: section,
                    name: name,
                    credit_hours: credit_hours,
                    department: did,
                    instructor: instructor
                }
            }))
            const course = data.data.createCourse
            console.log("New Course: ", course)
            return true
        }catch(error){
            const m = "Could not generate course"
            console.error(m, error)
            toast.error(m)
        }
        return false
    }

    registrarShowDepartments(context, setOption = true) {
        if (setOption)
            context.setState({registrarOptions: RegistrarOptions.VIEW_DEPARTMENTS, data: []})

        API.graphql(graphqlOperation(listDepartments))
            .then(function (data) {
                let departments = data.data.listDepartments.items
                departments = departments.map(function (value) {
                    let head = value.head;
                    if (head != null) {
                        value.head_name = `${head.first_name} ${head.last_name}`
                    }
                    return value
                })
                console.log('departments', departments)
                context.setState({data: departments})
            })
            .catch(function (error) {
                const m = "Cannot load departments"
                toast.error(m)
                console.error(m, error)
            })
    }

    studentShowCourseReports(context) {
        context.setState({studentOption: StudentOptions.SHOW_COURSE_REPORTS})

        API.graphql(graphqlOperation(listCourseReports)).then(function(data) {
            let courseReport = data.data.listCourseReports.items
            courseReport = courseReport.map(function (value) {
                return value;
            })
            console.log('course_reports', courseReport)
            context.setState({data: courseReport})
        }).catch(function (error){
            const r = "Cannot load Course Report"
            toast.error(r)
            console.error(r, error)
        })
    }

    studentShowClasses(context) {
        context.setState({studentOption: StudentOptions.SHOW_CLASSES})

        API.graphql(graphqlOperation(listCourses)).then(function(data) {
            let courses = data.data.listCourses.items
            courses = courses.map(function (value) {
                return value;
            })
            console.log('courses', courses)
            context.setState({data: courses})
        }).catch(function (error){
            const c = "Cannot load Courses"
            toast.error(c)
            console.error(c, error)
        })
    }

    makeButton(item, index) {
        if ('popup' in item) {
            return item.popup
        }
        return <button key={index} onClick={() => item.onClick()}>{item.title}</button>
    }

    render() {
        return <>
            <div className='sideBySide'>
                <div className='verticalGroup'>
                    <p>Options {this.userType() != null ? ("for " + this.userType()) : ""}</p>
                    {this.buttonsForType()}
                </div>
                <div className='datapage'>
                    <MaterialTable
                        columns={this.getColumnsForType()}
                        data={this.state.data}
                        actions={this.getActionsForType()}
                        title="Results"
                    />
                </div>
            </div>
        </>
    }
}