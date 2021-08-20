const clientIo = io.connect("https://dev.knowledgetalk.co.kr:7100/SignalServer",{});

const roomIdInput = document.getElementById("roomIdInput");
const videoBox = document.getElementById("videoBox");
const printBox = document.getElementById("printBox")

const CreateRoomBtn = document.getElementById("CreateRoomBtn");
const RoomJoinBtn = document.getElementById("RoomJoinBtn");
const SDPBtn = document.getElementById("SDPBtn");


const CPCODE = "KP-CCC-demouser-01"
const AUTHKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoidGVzdHNlcnZpY2UiLCJtYXhVc2VyIjoiMTAwIiwic3RhcnREYXRlIjoiMjAyMC0wOC0yMCIsImVuZERhdGUiOiIyMDIwLTEyLTMwIiwiYXV0aENvZGUiOiJLUC1DQ0MtdGVzdHNlcnZpY2UtMDEiLCJjb21wYW55Q29kZSI6IkxJQy0wMyIsImlhdCI6MTU5Nzk3NjQ3Mn0.xh_JgK67rNPufN2WoBa_37LzenuX_P7IEvvx5IbFZI4"

let members;
let roomId;
let userId;
let remoteId;
let host;

let peers = {};
let streams = {};



/*clinet에서 SdpTest라는 이벥트를 생성시켜서 
  socket server에게 데이터를 전달하는부분
*/

/*client에서 발생시킨 SdpTest라는 이벤트를 받아서
data안에있는 event op 에 따라 CreateRoom,JoinRoom,Sdp를 처리한다.
*/


/* sdp 교환과정
Local stream, peer 생성 및 sdp return
sdp offer를 생성하고 자신의 정보를 저장하고 offer를 remoteId에게 보내서 peer에 저장한다.
remoteId는 anwser를 생성하고 자신의 정보를 저장하고 anwser 정보를 상대방에게 전달하고 peer에 저장되면
peer가 연결된 상태이다.
*/


const socketLog = (type, contents) => {
    let jsonContents = JSON.stringify(contents);
    const textLine = document.createElement("p");
    const textContents = document.createTextNode(`[${type}] ${jsonContents}`);
    textLine.appendChild(textContents);
    printBox.appendChild(textLine);
}

//sendData 메소드를 만들어서 data값을 knowledgetalk 이벤트를 발생
const sendData = data => {
    data.cpCode = CPCODE
    data.authKey = AUTHKEY
    socketLog('send', data);
    clientIo.emit("knowledgetalk", data);
}

//영상 출력 화면 Box 생성
const createVideoBox = id => {
    let videoContainner = document.createElement("div");
    videoContainner.classList = "multi-video";
    videoContainner.id = id;

    let videoLabel = document.createElement("p");
    let videoLabelText = document.createTextNode(id);
    videoLabel.appendChild(videoLabelText);

    videoContainner.appendChild(videoLabel);

    let multiVideo = document.createElement("video");
    multiVideo.autoplay = true;
    multiVideo.id = "multiVideo-" + id;
    videoContainner.appendChild(multiVideo);

    videoBox.appendChild(videoContainner);
}


const createSDPOffer = async id => {
    return new Promise(async (resolve, reject) => {
        //peers 객체생성 
        peers[id] = new RTCPeerConnection();
        //카메라 호출
        streams[id] = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
       //Html video tag 가져온다
        let str = 'multiVideo-'+id;
        let multiVideo = document.getElementById(str);
        //스트림에 피어넣기
        multiVideo.srcObject = streams[id];
        streams[id].getTracks().forEach(track => {
            peers[id].addTrack(track, streams[id]);
        });
          //로컬 sdp offer생성
        peers[id].createOffer().then(sdp => {
            //로컬 sdp 저장
            peers[id].setLocalDescription(sdp);
            return sdp;
        }).then(sdp => {
            resolve(sdp);
        })

        //상대방 영상 가져와서 화면에 출력
        peers[id].ontrack = e => {
            streams[remoteId] = e.streams[0];

            let multiVideo = document.getElementById(`multiVideo-${remoteId}`);
            multiVideo.srcObject = streams[remoteId];
        }
    })
}

//send sdp answer
const createSDPAnswer = async data => {
    //상대방 id
    let displayId = data.userId;
    //피어 객체 생성
    peers[displayId] = new RTCPeerConnection();
    //피어에 상대방 영상 있을시 작동하는 이벤트
    peers[displayId].ontrack = e => {
        streams[displayId] = e.streams[0];
        //상대방 영상을 Html video 태그에 넣기
        let multiVideo = document.getElementById(`multiVideo-${displayId}`);
        multiVideo.srcObject = streams[displayId];
    }

    
    //내 영상 화면에 출력하고 피어에 담기
    streams[userId] = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
    let str = 'multiVideo-'+userId;
    let multiVideo = document.getElementById(str);
    multiVideo.srcObject = streams[userId];
    //peers[] 자신의 스트림넣기
    streams[userId].getTracks().forEach(track => {
        peers[displayId].addTrack(track, streams[userId]);
    });
     //상대방 sdp 피어에 넣기
    await peers[displayId].setRemoteDescription(data.sdp);
    //내 sdp 피어에 넣기
    let answerSdp = await peers[displayId].createAnswer();
    await peers[displayId].setLocalDescription(answerSdp);
    //내 sdp 전송
    peers[displayId].onicecandidate = e => {
        if(!e.candidate){
            let reqData = {
                "eventOp": "SDP",
                "sdp": peers[displayId].localDescription,
                "roomId": data.roomId,
                "usage": "cam",
                "userId": userId
            };

            sendData(reqData);
        }
    }
}

//퇴장 시, stream,peer 제거
const leaveParticipant = id => {
    document.getElementById(`multiVideo-${id}`).remove();
    document.getElementById(id).remove();

    if(streams[id]){
        streams[id].getVideoTracks()[0].stop();
        streams[id].getAudioTracks()[0].stop();
        streams[id] = null;
        delete streams[id];
    }

    if(peers[id]){
        peers[id].close();
        peers[id] = null;
        delete peers[id];
    }

}

/********************** button event **********************/
CreateRoomBtn.addEventListener('click', () => {
    host = true;
    let data = {
        "eventOp":"CreateRoom"
    }

    sendData(data);
});

RoomJoinBtn.addEventListener('click', () => {
    let data = {
        "eventOp":"RoomJoin",
        "roomId": roomIdInput.value
    }

    sendData(data);
});

SDPBtn.addEventListener('click', async () => {

    let sdp = await createSDPOffer(userId);

    let data = {
        "eventOp":"SDP",
        "pluginId": undefined,
        "roomId": roomIdInput.value,
        "sdp": sdp,
        "usage": "cam",
        "userId": userId,
        "host": host
    }

    sendData(data);
})



/********************** event receive **********************/
clientIo.on("knowledgetalk", async data => {

    socketLog('receive', data);

    switch(data.eventOp || data.signalOp) {
        case 'CreateRoom':
            if(data.code == '200'){
                createRoom(data);
                CreateRoomBtn.disabled = true;
            }
            break;

        case 'RoomJoin':
            if(data.code == '200'){
                roomJoin(data);
                RoomJoinBtn.disabled = true;
                CreateRoomBtn.disabled = true;
                if(data.members){
                    members = Object.keys(data.members);

                }
                for(let i=0; i<members.length;i++){
                    let user = document.getElementById(members[i]);
                    if(!user){
                        createVideoBox(member[i]);
                    }
                    if(members[i] !== userId) remoteId = members[i];
                }
            }
            break;

        case 'StartSession':
            startSession(data);
            break;

        case 'SDP':
            if(data.useMediaSvr === 'N'){
                if(data.sdp && data.sdp.type === 'offer'){
                    await createSDPAnswer(data);
                }
                else if(data.sdp && data.sdp.type === 'answer'){
                    await peers[userId].setRemoteDescription(new RTCSessionDescription(data.sdp));
                }
            }
            break;
        case 'ReceiveFeed':
            receiveFeed(data)
            break;

        case 'Presence':
            if(data.action == 'exit'){
                leaveParticipant(data.userId)
            }
            break;

    }

});


const createRoom =  data => {
    roomIdInput.value = data.roomId;

    //room id copy to clipboard
    roomIdInput.select();
    roomIdInput.setSelectionRange(0, 99999);
    document.execCommand("copy");

    
}

const roomJoin = data => {
    userId = data.userId;
}

const startSession = async data => {
    members = Object.keys(data.members);

    
    if(data.useMediaSvr == 'N'){
        for(let i=0; i<members.length; ++i){
            let user = document.getElementById(members[i]);
            if(!user){
                createVideoBox(members[i]);
            }

            if(members[i] !== userId) remoteId = members[i];
        }

        SDPBtn.disabled = false;
        host = data.host;
    }
}

const receiveFeed = (data) => {
    data.feeds.forEach(result => {
        let data = {
            "eventOp":"SendFeed",
            "roomId": roomIdInput.value,
            "usage": "cam",
            "feedId": result.id,
            "display": result.display
        }

        sendData(data);
    })
}

