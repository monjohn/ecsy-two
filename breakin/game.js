import {Component, System, World} from "../node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill,
    Camera,
    CameraFollowsSprite,
    Canvas,
    ECSYTwoSystem, FilledSprite, ImageSprite, Sprite,
    SpriteSystem,
    startWorld
} from '../ecsytwo.js'
import {FullscreenButton} from '../fullscreen.js'
import {load_tilemap_from_url, TileMap, TileMapSystem} from '../tiles.js'
import {InputState, KeyboardState, KeyboardSystem} from '../keyboard.js'
import {make_point} from '../utils.js'
import {Dialog, DialogSystem, WaitForInput} from '../dialogs.js'
import {OverheadControls, OverheadControlsPlayer} from './rpg.js'

let TILE_SIZE = 16
let world = new World()

const LEVELS = {}

load_tilemap_from_url("maps/dialog.json").then((data)=> {
    console.log("loaded dialog")
    console.log('we have the tile-map data',data)
    LEVELS.dialog = {
        data:data,
        start: {x:0, y:0}
    }
})


class ShowSignAction {
    constructor() {
        this.text = "some text"
    }
}

class ActionSystem extends System {
    execute(delta, time) {
        this.queries.actions.added.forEach(ent => {
            this.world.getSystem(OverheadControls).enabled = false
            let action = ent.getComponent(ShowSignAction)
            console.log("showing dialog with text", action.text)
            view.addComponent(Dialog, {
                text:action.text,
                tilemap:LEVELS.dialog.data,
                text_offset: make_point(50,50),
                text_color: 'green',
            })
            view.addComponent(WaitForInput, {onDone:()=>{
                    view.removeComponent(Dialog)
                    ent.removeComponent(ShowSignAction)
                    this.world.getSystem(OverheadControls).enabled = true
                }})
        })
        this.queries.input_waiters.added.forEach(ent => {
            let waiter = ent.getComponent(WaitForInput)
            waiter.start_time = time
            waiter.timeout = 0.5*1000
        })
        this.queries.input_waiters.results.forEach(waiting_ent => {
            let waiter = waiting_ent.getComponent(WaitForInput)
            if(time - waiter.start_time > waiter.timeout) waiter.started = true
            if(waiter.started) {
                this.queries.input.results.forEach(ent => {
                    let input = ent.getComponent(InputState)
                    if (input.anyReleased()) {
                        if(waiter.onDone) waiter.onDone()
                        waiting_ent.removeComponent(WaitForInput)
                    }
                })
            }
        })
    }
}
ActionSystem.queries = {
    actions: {
        components:[ShowSignAction],
        listen: {
            added:true,
            removed:true,
        }
    },
    input_waiters: {
        components: [WaitForInput],
        listen: {
            added:true,
            removed:true,
        }
    },
    input: {
        components: [InputState]
    }
}
world.registerSystem(ActionSystem)
world.registerSystem(ECSYTwoSystem)
world.registerSystem(TileMapSystem)
world.registerSystem(DialogSystem)
world.registerSystem(SpriteSystem)
world.registerSystem(KeyboardSystem)
world.registerSystem(OverheadControls)

let player = world.createEntity()
    .addComponent(Sprite, { x: 100, y: 100, width: 16, height: 16})
    .addComponent(OverheadControlsPlayer, {
        ivx: 100, ivy: 100,
        debug:false,
        blocking_layer_name: "floor",
        blocking_object_types: ['sign'],
        on_sign:(text)=>{
            console.log("showing a sign", text)
            view.addComponent(ShowSignAction, {text: text})
        }
    })
    .addComponent(ImageSprite, { src: "images/akira.png"})

let view = world.createEntity()
    .addComponent(Canvas, { scale: 3, width:TILE_SIZE*16, height: TILE_SIZE*13, pixelMode:true})
    .addComponent(BackgroundFill, {color: 'rgb(240,255,240)'})
    .addComponent(Camera, { x:1*TILE_SIZE, y:0*TILE_SIZE})
    .addComponent(CameraFollowsSprite, { target: player})
    .addComponent(FullscreenButton)
    .addComponent(InputState)
    .addComponent(KeyboardState, {
        mapping: {
            'w':'up',
            'a':'left',
            's':'down',
            'd':'right',
            ' ':'talk',
            'ArrowLeft':'left',
            'ArrowRight':'right',
            'ArrowUp':'up',
            'ArrowDown':'down',
        }
    })



load_tilemap_from_url("./maps/arcade.json").then(level => {
    console.log("level info is",level)
    view.addComponent(TileMap, level)
})

startWorld(world)
