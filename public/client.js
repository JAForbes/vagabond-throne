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

function Move({ velocity:v, coords:p, id }){

    return [
      { action: 'UpdateComponent'
      , component: { x: p.x + v.x, y: p.y + v.y }
      , type: 'Coords'
      , id
      }
    ]
}

function Frame( { RenderFlat={}, Coords={}, Dimensions={}, Velocity={} }){
  
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

            return { action: 'Move', coords, velocity, id }
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
  
  function loop(){
    state.actions.push(
      { action: 'ClearScreen' }
      ,{ action: 'Frame' }
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
      }

    }
    requestAnimationFrame(loop) 
  }
  
  loop()
  
  return canvas
}
