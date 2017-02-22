/* globals downplay */
const merge = Object.assign

Function.prototype.map = function map(g){
  const f = this
  
  return function map_g(...args){
    return g(f(...args))
  }
}

Array.prototype.flatMap = function(f){
  return this.map( (v) => f(v) )
  .reduce( (p,n) => p.concat(n) )
}

function Move({ velocity:v, coords:p, acceleration:a, id }){

    return [
      { action: 'UpdateComponent'
      , component: { x: v.x + a.x, y: v.y + a.y }
      , type: 'Velocity'
      , id
      }
      ,{ action: 'UpdateComponent'
      , component: { x: 0, y: 0 }
      , type: 'Acceleration'
      , id
      }
      ,{ action: 'UpdateComponent'
      , component: { x: p.x + v.x, y: p.y + v.y }
      , type: 'Coords'
      , id
      }
    ]
}

function AirDrag({ velocity:v, id}){
  
  return [
    { action: 'UpdateComponent'
    , component: { x: v.x, y: v.y }
    , type: 'Velocity'
    , id
    }
  ]
}

function Frame( { 
  RenderFlat={}
  , Coords={}
  , Dimensions={}
  , Velocity={}
  , Acceleration={} 
  , AirDrag={}
}){
  
  return Object.keys( RenderFlat )
      .map(function(id){

        const coords = Coords[id]
        const dimensions = Dimensions[id]
        const render = RenderFlat[id]

        return { action: 'RenderFlat', coords, dimensions, render, id }
      })
      .concat(    
        Object.keys( Velocity )
          .map(function(id){

            const velocity = Velocity[id]
            const coords = Coords[id]
            const acceleration = Acceleration[id]

            return { action: 'Move', coords, velocity, acceleration, id }
          })
      )
      .concat(    
        Object.keys( AirDrag )
          .map(function(id){

            const velocity = Velocity[id]
            
            return { action: 'AirDrag', velocity, id }
          })
      )
}

function RenderFlat({ coords, dimensions, render: { color }, id}){
    
    return [
      { fillStyle: color 
      , args: [coords.x, coords.y, dimensions.x, dimensions.y]
      , type: 'fillRect' 
      , action: 'CanvasRender'
      , id
      } 
    ]
}

function update( state, action ){
  
  if( action.action == 'Frame' ){
    
    return merge(state, {
      actions: state.actions.concat(
        Frame(state)
      )
    })
    
  } else if( action.action == 'RenderFlat' ){
    
    return merge(state, { 
      actions: state.actions.concat(
        RenderFlat(action)
      ) 
    })
  } else if ( action.action == 'AirDrag' ){
    
    return merge(state, {
      actions: state.actions.concat(
        AirDrag(action)
      )
    })
    
  } else if ( action.action == 'Move' ){
    
    return merge(state, {
      actions: state.actions.concat(
        Move(action)
      )
    })
    
  } else if (action.action == 'UpdateComponent'){
    
    const { component, type, id } = action

    return merge(
      state
      ,{ [type]: 
        merge( state[type], {
          [id]: merge( state[type][id], component )
        })
      }
    )
  }
  
  return state
}


var state = { 
  actions: [] 
  ,sequence: 1
}


const level = {
name: 'Level 01'
,types: {
  'S': ({x,y,w,h,type}) => ({
    RenderFlat: { color: 'gray' }
    ,Dimensions: { x: w * 10, y: h * 10  }
    ,Coords: { x: x * 10, y: y * 10 }
    ,Acceleration: { x:0, y: 0 }
    ,Velocity: { x:0, y:0 }
    ,AirDrag: {}
    ,Input: {
      Left: { Acceleration: { x: -1 } }
      ,Right: { Acceleration: { x: 1 } }
      ,Up: { Acceleration: { y: -1 } }
      ,Down: { Acceleration: { y: 1 } }
    }
  })
  
  ,'#': ({x,y,w,h,type}) => ({
    RenderFlat: { color: 'blue' }
    ,Dimensions: { x: w * 10, y: h * 10  }
    ,Coords: { x: x * 10, y: y * 10 }
    ,Acceleration: { x:0, y: 0 }
    ,Velocity: { x:0, y:0 }
  })
  
  ,'E': ({x,y,w,h,type}) => ({
    RenderFlat: { color: 'red' }
    ,Dimensions: { x: w * 10, y: h * 10 }
    ,Coords: { x: x * 10, y: y * 10 }
    ,Acceleration: { x:0, y: 0 }
    ,Velocity: { x:0, y:0 }
  })
  
}
,data:
`
## ##           ####        #
#   #                      ##
#E  #                     ###
#####                    ####

                  ####

           ####

     #####
S    
###
` 
}

downplay(level.data)
  .forEach(function(item){
    const components = level.types[item.type](item)
    const entity = ++state.sequence
    Object.keys(components)
      .forEach(function(ComponentName){
        state[ComponentName] = state[ComponentName] || {}
        state[ComponentName][entity] = components[ComponentName]
      })
  })

document.body.appendChild( CanvasLoop() )
// DOMLoop()

function DOMLoop(){
  const nodes = {}
  
  function loop(){
    state.actions.push(
      { action: 'ClearScreen' }
      ,{ action: 'Frame' }
    )

    var action;
    while ( action = state.actions.shift() ){
      state = update(state, action)

      if( action.action == 'ClearScreen'){
        Object.keys(nodes)
          .forEach(function(id){
            if( state.CanvasRender && !state.CanvasRender[id] ){
               nodes[id].remove()
               delete nodes[id]
            }
          })
      } else if( action.action == 'CanvasRender') {
        const id = action.id
        
        if( !nodes[id] ){
          nodes[id] = document.createElement('div')
          document.body.appendChild(nodes[id])
        }
        
        if( action.type == 'fillRect' ){
          const [x,y,w,h] = action.args
          
          const div = nodes[id]
          div.style.width = w+'px'
          div.style.height = h+'px'
          div.style.position = 'absolute'
          div.style.transform = 'translate('+x+'px,'+y+'px)'
          div.style.backgroundColor = action.fillStyle
        }
      }
    }
    
    requestAnimationFrame(loop)
  }
  loop()
}

function CanvasLoop(){
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  const keys = {
    Up: 0
    ,Left: 0
    ,Right: 0
    ,Down: 0
  }
  
  window.addEventListener('keydown', function(e){
    const DIRECTION = 
      [e.keyCode == 37 && 'Left'
       , e.keyCode == 38 && 'Up'
       , e.keyCode == 39 && 'Right'
       , e.keyCode == 40 && 'Down'
      ]
      .find(Boolean)

    if( DIRECTION ){
      keys[DIRECTION] = keys[DIRECTION] || 0
      keys[DIRECTION] += 1 
    }    

  })
  
  window.addEventListener('keyup', function(e){
    const DIRECTION = 
      [e.keyCode == 37 && 'Left'
       , e.keyCode == 38 && 'Up'
       , e.keyCode == 39 && 'Right'
       , e.keyCode == 40 && 'Down'
      ]
      .find(Boolean)

    if( DIRECTION ){
      keys[DIRECTION] = keys[DIRECTION] || 0
      keys[DIRECTION] = 0 
    }
    
  })
  
  function loop(){
    state.actions.push(
      { action: 'ClearScreen' }
      ,{ action: 'Frame' }
      ,{ action: 'CheckKeyboardInput' }
    )
    
    
    var action;
    while ( action = state.actions.shift() ){
      state = update(state, action)

      if( action.action == 'ClearScreen' ){
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      } else if( action.action == 'CanvasRender') {
        context.fillStyle = action.fillStyle 
        context[action.type].apply(context, action.args)
      } else if( action.action == 'CheckKeyboardInput' ){
        
        Object.keys(keys)
          .filter( direction => keys[direction] )
          .forEach(function(direction){
            
            Object.keys(state.Input).forEach(function(entity){
              
              const input = state.Input[entity]
              
              if( input[direction] ){
                 Object.keys( input[direction] )
                  .forEach(function( ComponentType ){
                     const original = state[ComponentType][entity] || {}
                     const mixin = input[direction][ComponentType]
                   
                     state[ComponentType][entity] = Object.assign(original, mixin)
                  })
              }
            })
          })
      }

    }
    requestAnimationFrame(loop) 
  }
  
  loop()
  
  return canvas
}
