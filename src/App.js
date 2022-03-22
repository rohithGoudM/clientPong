import React from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import Box, { BACKGROUND, PLAYER, BALL } from './components/box.jsx';

import './App.css';

const client = new W3CWebSocket('ws://54.183.40.180:8080/ws');

//TODO, create client.onmessage and test
// send and receive state

let movedPlayer;
/* size */
const ROW_SIZE = 11
const COL_SIZE = 21

const BALL_POSITION = Math.floor(ROW_SIZE/2)*COL_SIZE + Math.floor(COL_SIZE/2);
console.log("Ball pos: "+BALL_POSITION);    

/* paddle */
const PADDLE_BOARD_SIZE = 3;
const PADDLE_EDGE_SPACE = 1;

/* buttons */
const PLAYER1_UP   = 38  // up arrow
const PLAYER1_DOWN = 40  // down arrow
const PAUSE       = 32  // space
const PLAYER2_UP  = 87
const PLAYER2_DOWN= 83

const InitialState = () => {
    const paddle = [...Array(PADDLE_BOARD_SIZE)].map((_, pos) => pos);
    return {
        /* board */
        Player2: paddle.map(x => (x  * COL_SIZE) + PADDLE_EDGE_SPACE + Math.floor(ROW_SIZE/2)*COL_SIZE- COL_SIZE ),
        Player1: paddle.map(x => ((x+1) * COL_SIZE)-(PADDLE_EDGE_SPACE+1)+ Math.floor(ROW_SIZE/2)*COL_SIZE- COL_SIZE),
        // Ball: Math.round((ROW_SIZE * COL_SIZE)/2)-1+ Math.round(COL_SIZE/2),
        Ball:BALL_POSITION,
        /* Ball */
        BallSpeed: 135,
        DeltaY: -COL_SIZE,
        DeltaX: -1, // -1 means the Ball is moving towards Player2 1 means towards Player1
        Pause: true,
        /* Score */
        Player2Score: 0,
        Player1Score: 0,
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = InitialState();
        console.log(this.state.Player1);
        console.log(this.state.Player2);
    }
    
    resetGame = () => {
        client.send(JSON.stringify({
           Ball: BALL_POSITION,
        }));
        // this.setState({
        //    Ball: BALL_POSITION,
        // })
    }

    moveBoard = (playerBoard, isUp) => {
        const playerEdge = isUp? playerBoard[0]: playerBoard[PADDLE_BOARD_SIZE-1];

        if (!this.touchingEdge(playerEdge)) {
            const DeltaY =  (isUp ? -COL_SIZE : COL_SIZE);
            /* if Ball touches the edge */
            const newDir = (this.state.DeltaY !== COL_SIZE ^ isUp) ? -this.state.DeltaY: this.state.DeltaY;
            
            if (!this.touchingEdge(this.state.Ball)) {
                switch (this.state.Ball) {
                    case playerEdge + DeltaY -1:       
                        client.send(JSON.stringify({
                            DeltaY: newDir,
                            DeltaX: -1,
                        }));
                        break;
                    case playerEdge:                 
                        client.send(JSON.stringify({
                            DeltaY: newDir,
                        }));                        
                        break;
                    case playerEdge + DeltaY + 1:
                        client.send(JSON.stringify({
                            DeltaY: newDir,
                            DeltaX: 1,
                        }));
                        break;
                }
            }
            return playerBoard.map(x=> x + DeltaY);
        }      
        return false
    }
    
    componentDidMount() {


        // this.state = InitialState();

        client.onmessage = (message)=>{
            console.log(message);
            let dataFromServer = JSON.parse(message.data);
            this.setState ({
                Player1: dataFromServer.Player1,
                Player2: dataFromServer.Player2,
                // Ball: Math.round((ROW_SIZE * COL_SIZE)/2)-1+ Math.round(COL_SIZE/2),
                Ball: dataFromServer.Ball,
                /* Ball */
                BallSpeed: dataFromServer.BallSpeed,
                DeltaY: dataFromServer.DeltaY,
                DeltaX: dataFromServer.DeltaX, // -1 means the Ball is moving towards Player2 1 means towards Player1
                Pause: dataFromServer.Pause,
                /* Score */
                Player2Score: dataFromServer.Player2Score,
                Player1Score: dataFromServer.Player1Score,
            });
        }
        /* moving the Ball */
        setInterval(() => {
            if (!this.state.Pause){
                this.bounceBall();
            }
        }, this.state.BallSpeed);
        
        document.onkeydown = this.keyInput;
        document.title = "ping-pong"
    }
    
    touchingEdge = (pos) => (0 <= pos && pos < COL_SIZE) || (COL_SIZE*(ROW_SIZE-1) <= pos && pos < COL_SIZE * ROW_SIZE) 

    touchingPaddle = (pos) => {
        return (this.state.Player2.indexOf(pos) !== -1) || 
            (this.state.Player1.indexOf(pos) !== -1) ||
            this.state[(this.state.DeltaX === -1) ? "Player2":"Player1"].indexOf(pos+this.state.DeltaX) !== -1;
    }

    isScore = (pos) => (this.state.DeltaX === -1 && pos % COL_SIZE === 0) || (this.state.DeltaX === 1 && (pos+1) % COL_SIZE === 0)

    touchingPaddleEdge = (pos) => this.state.Player2[0] === pos ||
                                this.state.Player2[PADDLE_BOARD_SIZE -1] === pos ||
                                this.state.Player1[0] === pos ||
                                this.state.Player1[PADDLE_BOARD_SIZE -1] === pos

    bounceBall = () => {
        const newState = this.state.Ball + this.state.DeltaY+this.state.DeltaX;
        if (this.touchingEdge(newState)) {
            client.send(JSON.stringify({DeltaY: -this.state.DeltaY}));
        } 

        if (this.touchingPaddleEdge(newState)) {
            client.send(JSON.stringify({DeltaY: -this.state.DeltaY}));
        }

        if (this.touchingPaddle(newState)) {
            client.send(JSON.stringify({DeltaX: -this.state.DeltaX}));
        } 
        
        /* updating board */
        client.send(JSON.stringify({Ball: newState}));
        // this.setState({Ball: newState});

        /* checking if loss or won */
        if (this.isScore(newState)) {
            if (this.state.DeltaX !== -1) {
                /* Player2 won */ 
                client.send(JSON.stringify({
                    Player2Score: this.state.Player2Score+1,
                    Ball: BALL_POSITION,
                    Pause: true
                    // BallSpeed:this.state.BallSpeed-20,
                }));
            } else {
                /* Player1 won */ 
                client.send(JSON.stringify({
                    Player1Score: this.state.Player1Score+1,
                    Ball: BALL_POSITION,
                    Pause: true
                    // BallSpeed:this.state.BallSpeed-20,
                }))
            }
            // this.setState({Pause: true})
            // this.resetGame();
        }
    } 

    keyInput = ({keyCode}) => {
        switch (keyCode) {
            case PLAYER2_UP:
            case PLAYER2_DOWN:
                movedPlayer = this.moveBoard(this.state.Player2, keyCode===PLAYER2_UP); 
                if (movedPlayer) {
                    client.send(JSON.stringify({Player2: movedPlayer, Pause: false}));
                }
                break;
            case PLAYER1_UP:
            case PLAYER1_DOWN:
                movedPlayer = this.moveBoard(this.state.Player1, keyCode===PLAYER1_UP); 
                if (movedPlayer) {
                    client.send(JSON.stringify({Player1: movedPlayer, Pause: false}));
                }
                break;
            case PAUSE:
                client.send(JSON.stringify({Pause: true}));
                break;
        }
    }

    render() {
        const board = [...Array(ROW_SIZE * COL_SIZE)].map((_, pos) => {
            let val = BACKGROUND;
            if ((this.state.Player2.indexOf(pos) !== -1) || (this.state.Player1.indexOf(pos) !== -1)) {
                val = PLAYER;
            } else if (this.state.Ball === pos) {
                val = BALL;
            }
            return <Box key={pos} k={pos} name={val} />;
        })

        const divider = [...Array(ROW_SIZE)].map(_=> <div>{"|"}</div>);
        return (
        <div className="outer">
            <h1> PONG </h1>
            {/*<h1> {"[space]"} {this.state.Pause? "PLAY/Pause": "play/PAUSE"} </h1>*/}
            <div className="inner">
                <div className="style">{board}</div>
                <div className="score">{this.state.Player2Score}</div>
                <div className="dividerStyle">  {divider} </div>
                <div className="player2score">{this.state.Player1Score}</div>

            </div>
            <h3> Player 1: W is up, S is down </h3>
            <h3> Player 2: ↑ is up, ↓ is down </h3>
        </div>
        )
    }
}


export default App;