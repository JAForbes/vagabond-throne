/* globals downplay */
const merge = Object.assign

function Move(state, { velocity:v, coords:p, acceleration:a, id }){

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

function Frame(state, { 
  RenderFlat={}
  , Coords={}
  , Dimensions={}
  , Velocity={}
  , Acceleration={} 
  , AirDrag={}
  , Collideable={}
}){
  
  return merge(state, {
    actions: state.actions.concat(
      Object.keys( RenderFlat )
      .map(function(id){
        return { action: 'RenderFlat', id }
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
            
            return merge({ action: 'AirDrag', id }, component)
          })
      )
      .concat(
        { action: 'Collideable' }
      )
    )
  })
}

function RenderFlat(state, { coords, dimensions, render: { color }, id}){
  
    return merge(state, { 
      actions: state.actions.concat([
        { fillStyle: color 
        , args: [coords.x, coords.y, dimensions.x, dimensions.y]
        , type: 'fillRect' 
        , action: 'CanvasRender'
        , id
        }
      ]) 
    })
}

function Collideable(state){
  
  const collisions =
    Object.keys(state.Collideable || {})
      .reduce(function(p, a){

        return Object.keys( state.Collideable[a].is )
          .reduce(function(p, Type){

            return Object.keys(state[Type]).reduce(function(p, b){
              if( a != b && !p.processed[a+':'+b] ){

                const { x: aW, y: aH } = state.Dimensions[a]
                const { x: bW, y: bH } = state.Dimensions[b]
                const { x: aX, y: aY } = state.Coords[a]
                const { x: bX, y: bY } = state.Coords[b]

                const [TOP, LEFT, BOTTOM, RIGHT] = [aY, aX, aY+aH, aX + aW]
                const [top, left, bottom, right] = [bY, bX, bY+bH, bX + bW]

                const outside = 
                  RIGHT < left
                  || BOTTOM < top
                  || TOP > bottom
                  || LEFT > right

                const processed = 
                   { [a+':'+b]: true, [b+':'+a]: true }

                const collisions = 
                  outside
                  ? {}
                  : processed
                
                return merge( 
                  p, {  
                    processed: merge( p.processed, processed )
                    ,collisions: merge( p.collisions, collisions )
                  } 
                )
              } else {
                return p
              }

            }, p)

          }, p)

      }, { processed: {}, collisions: {} })
  
  
  function saveMixinType(a, Type){
    return function saveMixinA(state, MixinType ){
      var mixin = state.Collideable[a].is[Type][MixinType]
      
      return merge(state, {
        [MixinType]: merge( state[MixinType] || {}, {
         [a]: merge((state[MixinType] || {})[a], mixin)
        })
      })  
    }
  }
  
  function saveAllMixinsForACollisionType(a){
    return function saveAllMixinsForACollisionType_a(state, Type){
      return Object.keys( state.Collideable[a].is[Type] )
        .reduce( saveMixinType(a, Type), state)
    }
  }
  
  function typeExistsInState(state, b){
    return function typeExistsInStateType(Type){
      return b in state[Type]
    }
  }
  
  function mixinAllApplicableTypesFromCollision(state, [a,b]){
      return Object.keys(state.Collideable[a].is)
        .filter(typeExistsInState(state, b))
        .reduce(saveAllMixinsForACollisionType(a), state)
  }
  
  const mixedInIsState = 
    Object.keys(collisions.collisions)
    .map( k => k.split(':') )
    .reduce(mixinAllApplicableTypesFromCollision, state)
  
  
  
  return state
  
}

function update( state, action ){
  
  if( action.action == 'Frame' ){
    
    return Frame(state, state)
    
  } else if( action.action == 'RenderFlat' ){
    
    const id = action.id
    const coords = state.Coords[id]
    const dimensions = state.Dimensions[id]
    const render = state.RenderFlat[id]

    return RenderFlat( state, merge(action, { coords, dimensions, render }) )
  } else if ( action.action == 'AirDrag' ){
    
    const velocity = state.Velocity[action.id]
    
    return AirDrag( state, Object.assign( action, {velocity}) )
    
  } else if ( action.action == 'Move' ){
    
    
    const velocity = state.Velocity[action.id]
    const coords = state.Coords[action.id]
    const acceleration = state.Acceleration[action.id]

    return Move( state, merge(action, { coords, velocity, acceleration }))
    
  } else if ( action.action == 'Collideable' ){
    
    const id = action.id
    const collideable = state.Collideable[id]
    
    return Collideable( state, { collideable, id, state })
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
    ,Player: {}
    ,Collideable: {
      against: {}
      ,is: {
        Floor: {
          RenderFlat: { color: 'red' }
        }
      }
      ,was: {
        Floor: {
          RenderFlat: { color: 'gray' }
        }
      }
    }
  })
  
  ,'#': ({x,y,w,h,type}) => ({
    RenderFlat: { color: 'blue' }
    ,Dimensions: { x: w * 10, y: h * 10  }
    ,Coords: { x: x * 10, y: y * 10 }
    ,Acceleration: { x:0, y: 0 }
    ,Velocity: { x:0, y:0 }
  })
  ,'T': ({x,y,w,h,type}) => ({
    RenderFlat: { color: 'green' }
    ,Dimensions: { x: w * 10, y: h * 10  }
    ,Coords: { x: x * 10, y: y * 10 }
    ,Acceleration: { x:0, y: 0 }
    ,Velocity: { x:0, y:0 }
    ,Floor: {}
    ,Collideable: {
      against: {}
      ,is: {}
      ,was: {}
    }
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
TTTTT                    ####

                  ####

           ####

     #####
S    
TTT
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
