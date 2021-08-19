const express = require("express");
const socketio = require("socket.io");
const http = require("http");


//express 서버생성
const app = express();
app.get("/client",(req,res)=> res.sendFile(`${__dirname}/client.html`));
const server = http.createServer(app);

//socket io 시작 
const io = socketio(server)
io.on("connection",(socket)=>{
});
server.listen(3000,()=>console.log('서버시작!'));
/*
const roomIdInput = document.getElementById("roomIdInput");
const videoBox = document.getElementById("videoBox");
const printBox = document.getElementById("printBox")
const CreateRoomBtn = document.getElementById("CreateRoomBtn");
const RoomJoinBtn = document.getElementById("RoomJoinBtn");
const SDPBtn = document.getElementById("SDPBtn");
*/
let memebers;
let roomId;
let userId;


/*event data send*/
const sendData = data =>{
    io.emit("SdpTest",data);
}
/*event data receive*/
io.on("SdpTest", async data =>{
    socketLog('receive',data);

    switch(data.eventOp){
        case 'CreateRoom':
            if(data.code =='200'){
                CreateRoom(data);
               
            }
            

}

/*button event */
CreateRoomBtn.addEventListener('click',()=>{
    let data = {
        "eventOp" : "CreateRoom"
    }
    
    sendData(data);
})