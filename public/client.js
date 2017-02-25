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
  , Decollide={}
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
        Object.keys( Decollide )
        .map(function(id){
          return { action: 'Decollide', id }
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

function Decollide(state, {collideable, id}){
 
  const oldCoords = state.Coords[id]
  
  const adjustment = 
    Object.keys(collideable.against)
    .reduce(function(p, id){
      const r = collideable.against[id]
      
      return {
        x:  Math.abs(p.x) >= Math.abs(r.x) ? p.x : r.x
        ,y: Math.abs(p.y) >= Math.abs(r.y) ? p.y : r.y
      }
    }, { x:0 , y:0 })

  
  const coords = 

      // *2 = 
      // 1 to counter our continuing velocity that will still be applied
      // 1 to reverse how much we've already moved into the other entity
      { x: oldCoords.x + adjustment.x * 2
      , y: oldCoords.y + adjustment.y * 2
      }
  
  return merge(state, {
    Decollide: Object.keys(state.Decollide)
      .reduce(function(p, id2){
        return id == id2
          ? p
          : merge(p, {[id2]: state.Decollide[id2]} )
      }, {})
    
    ,Coords: merge(state.Coords, {
      [id]: coords
    })
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
                
                const V = state.Velocity[a] || { x:0, y:0 }
                const v = state.Velocity[b] || { x:0, y:0 }
                const { x: WIDTH, y: HEIGHT } = state.Dimensions[a]
                const { x: width, y: height } = state.Dimensions[b]
                const { x: LEFT, y: TOP } = state.Coords[a]
                const { x: left, y: top } = state.Coords[b]
                
                const [BOTTOM, RIGHT] = [TOP + HEIGHT, LEFT + WIDTH]
                const [bottom, right] = [top + height, left + width]

                const [ON_RIGHT, ABOVE, BELOW, ON_LEFT] = 
                  [ RIGHT < left
                  , BOTTOM < top
                  , TOP > bottom
                  , LEFT > right
                  ]
                
                // *2 = 
                // 1 to counter our continuing velocity that will still be applied
                // 1 to reverse how much we've already moved into the other entity
                const [WAS_LEFT, WAS_ABOVE, WAS_RIGHT, WAS_BELOW] =
                  [ (RIGHT - V.x * 2) < (left - v.x * 2)
                  , (BOTTOM - V.y * 2) < (top - v.y * 2)
                  , (LEFT - V.x * 2) > (right - v.x * 2)
                  , (TOP - V.y * 2) > (bottom - v.y * 2)
                  ]

                const outside = 
                  ON_RIGHT
                  || ABOVE
                  || BELOW
                  || ON_LEFT
                
                const collisions = 
                  outside
                  ? {}
                  :{ 
                    [a+':'+b]: 
                      { x: WAS_RIGHT
                         ? right - LEFT
                         : WAS_LEFT
                         ? left - RIGHT
                         : 0
                      , y: WAS_BELOW 
                         ? bottom - TOP
                         : WAS_ABOVE
                         ? -(BOTTOM - top)
                         : 0
                      }
                  
                  
                  , [b+':'+a]: 
                      { x: WAS_RIGHT
                         ? -(right - LEFT)
                         : WAS_LEFT
                         ? -(left - RIGHT)
                         : 0
                      , y: WAS_BELOW 
                         ? -(bottom - TOP)
                         : WAS_ABOVE
                         ? -(BOTTOM - top)
                         : 0
                      }
                  }
                
                const processed = 
                   { [a+':'+b]: true
                   , [b+':'+a]: true
                   }
              
                
                const decollisions =
                  outside && state.Collideable[a].against[b]
                  ? processed
                  : {}
                

                return merge( 
                  p, {  
                    processed: merge( p.processed, processed )
                    ,collisions: merge( p.collisions, collisions )
                    ,decollisions: merge( p.decollisions, decollisions)
                  } 
                )
              } else {
                return p
              }

            }, p)

          }, p)

      }, { processed: {}, collisions: {}, decollisions: {} })
  
  
  function saveMixinType(a, tense, Type){
    return function saveMixinA(state, MixinType ){
      var mixin = state.Collideable[a][tense][Type][MixinType]
      
      return merge(state, {
        [MixinType]: merge( state[MixinType] || {}, {
         [a]: merge((state[MixinType] || {})[a] || {}, mixin)
        })
      })  
    }
  }
  
  function saveAllMixinsForACollisionType(tense, a){
    return function saveAllMixinsForACollisionType_a(state, Type){
      return Object.keys( state.Collideable[a][tense][Type] )
        .reduce( saveMixinType(a, tense, Type), state)
    }
  }
  
  function typeExistsInState(state, b){
    return function typeExistsInStateType(Type){
      return b in state[Type]
    }
  }
  
  
  function mixinAllApplicableTypesFromCollision(tense){
    return function mixinAllApplicableTypesFromCollisionTense(state, [a,b]){
      return Object.keys(state.Collideable[a][tense])
        .filter(typeExistsInState(state, b))
        .reduce(saveAllMixinsForACollisionType(tense, a), state) 
    }
  }
  
  function manageAgainstHash(collisions){
    return function manageAgainstHashCollisions(state, id){
      
      return Object.keys( collisions.collisions )
        .concat( Object.keys( collisions.decollisions ))
        .reduce(function(state, key){
          const [a,b] = key.split(':')
          
          if(key in collisions.collisions  ){
            return merge(state, {
              Collideable: merge( state.Collideable, {
                [a]: merge( state.Collideable[a], {
                   against: merge( 
                     state.Collideable[a].against
                     , { [b]: collisions.collisions[a+':'+b] } 
                   )
                })
              })
            })  
          } else {
            return merge(state, {
              Collideable: merge( state.Collideable, {
                [a]: merge(state.Collideable[a], {
                  against: Object.keys(state.Collideable[a].against)
                    .reduce(function(p,b2){
                        return b != b2
                          ? merge(p, { [b2]: state.Collideable[a].against[b] } )
                          : p
                    }, {})
                })
              })
            })
            return state
          }
          
        }, state)
      
      return state  
    }
  }
  
  const mixedInIsState = 
    Object.keys(collisions.collisions)
    .map( k => k.split(':') )
    .reduce(mixinAllApplicableTypesFromCollision('is'), state)
  
  
  const mixedInWasState = 
    Object.keys(collisions.decollisions)
    .map( k => k.split(':') )
    .reduce( mixinAllApplicableTypesFromCollision('was'), mixedInIsState )
  
  return Object.keys( state.Collideable )
    .reduce( manageAgainstHash(collisions), mixedInWasState )
  
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
    
  } else if (action.action == 'Decollide'){
    
    const collideable = state.Collideable[action.id]
    return Decollide( state, Object.assign( action , { collideable }) )
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
          Decollide: {}
        }
      }
      ,was: {}
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
#####                    ####

                  ####

           ####

     TTTTT
S

#####
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
