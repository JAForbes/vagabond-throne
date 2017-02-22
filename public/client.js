/* globals downplay */
const merge = Object.assign

function Move(state, { velocity:v, coords:p, acceleration:a, id }){

  
  // james: this would be a lot nicer if I had access to lenses
  // james: but I'm trying to just stick with vanilla js for a while
  // james: to avoid getting bogged down in "perfect project" paralysis
  return merge(
    state, {
      Velocity: merge( state.Velocity || {}, {
        [id]: { x: v.x + a.x, y: v.y + a.y }
      })
      ,Acceleration: merge( state.Acceleration || {}, {
        [id]: { x: 0, y: 0 }
      })
      ,Coords: merge( state.Coords || {}, {
        [id]: { x: p.x + v.x, y: p.y + v.y }
      })
    }
  )
}

function AirDrag(state, { x=1,y=1, velocity:v, id}){
  
  return merge( state, {
    Velocity: merge(state.merge || {}, {
      
      [id]: { x: v.x * x, y: v.y * y }
    })
  })
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

            return { action: 'Move', id }
          })
      )
      .concat(    
        Object.keys( AirDrag )
          .map(function(id){

            const component = AirDrag[id]
            const velocity = Velocity[id]
            
            return merge({ action: 'AirDrag', id }, component)
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
    
    const velocity = state.Velocity[action.id]
    
    return merge(state, {
      actions: state.actions.concat(
        AirDrag( state, Object.assign( action, {velocity}) )
      )
    })
    
  } else if ( action.action == 'Move' ){
    
    
    const velocity = state.Velocity[action.id]
    const coords = state.Coords[action.id]
    const acceleration = state.Acceleration[action.id]

    return merge(state, {
      actions: state.actions.concat(
        Move( state, Object.assign(action, { coords, velocity, acceleration }))
      )
    })
    
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
    ,AirDrag: { x: 0.95, y: 0.95 }
    ,Input: {
      Left: { Acceleration: { x: -0.1 } }
      ,Right: { Acceleration: { x: 0.1 } }
      ,Up: { Acceleration: { y: -0.1 } }
      ,Down: { Acceleration: { y: 0.1 } }
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
