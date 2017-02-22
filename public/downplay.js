function downplay(level){
  function parseLevel(level){
    return level
    .split('\n')
    .reduce(function(parsed, line, y){
        return line
          .split('')
          .reduce(function(parsed, type, x){
            return type == ' '
              ? parsed
              : parsed.concat({ x, y, type , w: 1, h: 1 })
          }, parsed)
    }, [])
  }
   
  var aggregated = []
  const xs = {}
  
  parseLevel(level)
    .forEach(function(a, i, list){
      
      const left = 
        xs[a.x - 1]
        && xs[a.x - 1][a.y]
      
      const up = 
        xs[a.x]
        && xs[a.x][a.y - 1]
      
      if (left && left.h == 1 && left.type == a.type) {
        
        xs[a.x] = xs[a.x] || {}
        xs[a.x][a.y] = left
        
        left.w = left.w + 1
                
      } else if (up && up.w == 1 && up.type == a.type){

        xs[a.x] = xs[a.x] || {}
        xs[a.x][a.y] = up

        up.h = up.h + 1
        
      } else {
        
        xs[a.x] = xs[a.x] || {}
        xs[a.x][a.y] = a

        aggregated.push(a)  
      }
      
    })
  
    return aggregated
}