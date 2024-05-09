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
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`)

    // Upon Connection - only to User
    socket.emit('message', buildMsg(ADMIN , 'Welcome to chat App'))


    socket.on('enterRoom' , ({name , room}) =>{

        const prevRoom = getUser(socket.io)?.room

        if(prevRoom){
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message' , buildMsg(ADMIN, `${name} has left the room`))
        }

        const user = activateUser(socket.id , name , room)
    })

    // Upon Connection - only to User
    socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)} connected`)



    socket.on('message', data => {
        console.log(data)
        io.emit('message', `${socket.id.substring(0, 5)}: ${data}`)
    })


    //when user disconnects

    socket.on('disconnect', () => {
        socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)} disconnected`)

    })


    //listen for activity


    socket.on('activity', (name) => {
        socket.broadcast.emit('activity', name)
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
    return Array.from(new Set( UsersState.users.map(user => user.room)))
}


