import { Server } from "socket.io"
import express from 'express'
import path from 'path'
import { fileURLToPath } from "url"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3500
const ADMIN = 'Admin'

const app = express()
app.use(express.static(path.join(__dirname, 'public')))


const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["https://chat-app-t0wu.onrender.com", "https://chat-app-t0wu.onrender.com"]
    }
})

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`)

    // Upon Connection - only to User
    socket.emit('message', buildMsg(ADMIN, 'Welcome to chat App'))


    socket.on('enterRoom', ({ name, room }) => {

        const prevRoom = getUser(socket.io)?.room

        if (prevRoom) {
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`))
        }

        const user = activateUser(socket.id, name, room)

        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUserInRoom(prevRoom)
            })
        }

        socket.join(user.room)

        //To User That Joined
        socket.emit('message', buildMsg(ADMIN, `you have joined ${user.room} chat room`))

        //To EVeryone else
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has Joined the Room`))


        //Update Userlist for room

        io.to(user.room).emit('userList', {
            users: getUserInRoom(user.room)
        })

        io.emit('roomList', {
            room: getAllActiveRooms()
        })

    })

    //when user disconnects

    socket.on('disconnect', () => {
        const user = getUser(socket.id)
        UserLeaveApp(socket.id)
        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`))

            io.to(user.room).emit('userList', {
                users: getUserInRoom(user.room)
            })

            io.to('roomList', {
                rooms: getAllActiveRooms()
            })

            console.log(`User ${socket.id} disconnected`)
        }

    })

    //Listen for a message event

    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room
        if (room) {

            io.to(room).emit('message', buildMsg(name, text))
        }
    })

    //listen for activity
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room
        if (room) {
            socket.broadcast.to(room).emit('activity', name)

        }
    })

})


function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}



function activateUser(id, name, room) {
    const user = { id, name, room }

    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ])

    return user
}

function UserLeaveApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    )
}

function getUser(id) {
    return UsersState.users.find(user => user.id === id)
}


function getUserInRoom(room) {
    return UsersState.users.filter(user => user.id === id)
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)))
}


