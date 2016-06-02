Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

//////////////////

var page = tabris.create("Page", {
  title: "Comprehension - Differential Mapping - Color",
  topLevel: true
});

var getSum = function(vec){
    var sum = 0;
    for(var i = 0; i<vec.length; i++){
        sum += vec[i];
    }
    return sum;
}

var getNonMaxed = function(vec){
    var count = 0;
    for(var i = 0; i<vec.length; i++){
        if(vec[i] < 1 && vec[i] > 0)
          count++;
    }
    return count;
}

var distribute = function(vector, amount){
    var newVec = [];
    var extra = 0;
    for(var i = 0; i<vector.length; i++){
        if(vector[i] == 1){
           newVec.push(1);
           continue;
        }
        if(vector[i] == 0){
           newVec.push(0);
           continue;
        }
        var num = vector[i] + amount;
        var extra = 0;
        if(num > 1){
           extra += 1 - num;
           num = 1;
        }
        if(num < 0){
           extra += num;
           num = 0;
        }
        newVec.push(num);
    }
  
    if(extra != 0){
        newVec = distribute(newVec, extra/getNonMaxed(newVec));
    }
  
    return newVec;
}


// core library
DifferentialMap = function(rows, columns, vectorLength, nodeModel, nodeView, nodeController){

    this.rows = rows;
    this.columns = columns;
    this.vectorLength = vectorLength;

    this.nodeModel = nodeModel;
    this.nodeView = nodeView;
    this.nodeController = nodeController;

    this.nodes = [];
  
    this.ctx = null;
  
    this.initialize = function() {

        for(var i = 0; i < rows; i++){
            this.nodes.push([]);
           
            for(var j = 0; j < columns; j++){
                var currNode = this.nodes[i][j] = {
                    row : i,
                    col : j,
                    vectorLength: this.vectorLength,
                    weight: 1
                };
              
                currNode.parentMap = this;

                currNode.model = new this.nodeModel();
                if(currNode.model.init != null)
                    currNode.model.init(currNode);
               
                currNode.view = new this.nodeView();
                if(currNode.view.init != null)
                    currNode.view.init(currNode, currNode.model);
                
                currNode.controller = new this.nodeController();
                if(currNode.controller.init != null)
                    currNode.controller.init(currNode, currNode.model);

            }
        }
      
        var self = this;
      
        tabris.create("Canvas", {
           layoutData: {left: 0, top: 0, right: 0, bottom: 50}
        }).on("change:bounds", function(canvas, bounds) {
           self.ctx = canvas.getContext("2d", bounds.width, bounds.height);
           console.log("canvas here");
           self.draw();
        }).appendTo(page);
      
    }.bind(this);

    this.draw = function(){
        console.log(this.ctx);
        if(this.ctx != null){
          for(var i = 0; i < rows; i++){
              for(var j = 0; j < columns; j++){
                  this.nodes[i][j].view.draw(this.ctx);
              }
          }
        }
    }.bind(this);
  
    this.update = function(value){
       
         // finds the closest existing node.
         // calls update on that node and the nodes around it.
        var chosenRow = this.findRow(value);

        var closestNode = this.findClosest(value, chosenRow);
      
        this.insertRowComponent(value, chosenRow, closestNode.col, 1);
      
        var decRow = chosenRow;
        var decValue = value;
        while(decRow > 0){
           decRow--;
           var sum = getSum(decValue)/this.vectorLength;
           var newRowDiffAvg = decRow/this.rows;
           var rowDifferenceDiff = newRowDiffAvg - sum;
           var nonMaxes = getNonMaxed(decValue);
           var distribution = rowDifferenceDiff/nonMaxes;
           var decValue = distribute(decValue, distribution);
           this.insertRowComponent(decValue, decRow, closestNode.col, (1 - ((chosenRow - decRow))/this.rows)/5);
        }
      
      
        var incRow = chosenRow;
        var incValue = value;
        while(incRow < this.rows - 1){
           incRow++;
           var sum = getSum(incValue)/this.vectorLength;
           var newRowDiffAvg = incRow/this.rows;
           var rowDifferenceDiff = newRowDiffAvg - sum;
           var nonMaxes = getNonMaxed(incValue);
           var distribution = rowDifferenceDiff/nonMaxes;
           var incValue = distribute(incValue, distribution);
           this.insertRowComponent(incValue, incRow, closestNode.col, (1 - ((incRow - chosenRow))/this.rows)/5);
        }
      
      
    }.bind(this);
  
    this.insertRowComponent = function(newVec, row, col, startweight){
        this.nodes[row][col].controller.pullData(newVec, startweight);
      
        for(var i = 1 ; i < Math.round(this.columns/3); i++){
            var nCol = col+i;
            if(nCol >= this.columns)
                nCol = nCol % this.columns;
            this.nodes[row][nCol].controller.pullData(newVec, startweight/(i/2));
        }
      
        for(var i = 1 ; i < Math.round(this.columns/3); i++){
            nCol = col - i;
            if(nCol < 0)
              nCol = this.columns - (-nCol);
            this.nodes[row][nCol].controller.pullData(newVec, startweight/(i/2));
      
        }
    }
  
    this.findRow = function(value){
        var totalDist = 0;
        for(var i = 0; i < value.length; i++){
          totalDist += value[i];
        }
        totalDist /= value.length;
        totalDist *= (this.rows - 1);
        totalDist = Math.round(totalDist);
        console.log(totalDist);
        return totalDist;
    }.bind(this);
  
    this.findClosest = function(value, row){
        var smallestDistance = 1;
        var winningCol = -1;
        
        for(var j = 0; j < this.columns; j++){
            var distance = this.nodes[row][j].model.getDataDistance(value);
            if(distance < smallestDistance){
               smallestDistance = distance;
               winningCol = j;
            }
        }
        
        return this.nodes[row][winningCol];
    }.bind(this);
}

BaseNodeModel = function(){

    this.initialize = function(parentNode){
        this.parent = parentNode;
    }.bind(this);
    
    this.initData = function(vectorLength){
        this.data = [];
        for(var i = 0; i < vectorLength; i++){
            this.data.push(0);
        }
    }.bind(this);

    this.initRandomData = function(){
        for(var i = 0; i < this.data.length; i++){
            this.data[i] = Math.random();
        }
    }.bind(this);

    this.getDataDistance = function(vector){
        
        var distance = 0;
        for(var i = 0; i < this.data.length; i++){
            distance += Math.abs(vector[i] - this.data[i]); // max difference is 1 each
        }
        // return distance as unit vector.  divide by max possible (vec length, since 1 each)
        distance = distance / vector.length;
        return distance;
    }.bind(this);

}

BaseNodeView = function(){

    this.initialize = function(parentNode, model){
        this.parent = parentNode;
        this.model = model;
    }.bind(this);

    this.initTextObject = function(){
        this.textView = tabris.create("TextView", {
            font: "8px",
            layoutData: {left: 0, top: 0},
            text: ""
        }).appendTo(page);
    }.bind(this);

    this.draw = function(){
       var string = "[";
       for(var i = 0; i < this.model.data.length; i++){
         var val = Math.round(10* this.model.data[i]); 
         string += val + ",";
       }
       string += "]";
       page._children.remove(this.textView);
       this.textView = tabris.create("TextView", {
            font: "8px",
            layoutData: {left: this.parent.col * 25, top: this.parent.row * 50 + this.parent.col * 10},
            text: string
        }).appendTo(page);

    }.bind(this);
    
}

BaseNodeController = function(){

    this.initialize = function(parentNode, model){
        this.parent = parentNode;
        this.model = model;
    }.bind(this);

    // pull degree must be less than one.
    // if pull degree is one then the vector will be made identical to the target
    this.pullData = function(targetVector, pullDegree){
        var amountToPull = pullDegree / this.parent.weight;
        for(var i = 0; i < this.model.data.length; i++){
            // the difference between the target and the current data
            var difference = targetVector[i] - this.model.data[i];
            // multiply difference by pull degree
            difference *= amountToPull;

            this.model.data[i] += difference;
          
        }
        this.parent.weight += (0.2 * pullDegree);
    }.bind(this);

}

var buildMap = function(config){
    var Map = new DifferentialMap(
        config.rows, 
        config.columns, 
        config.vectorLength,
        config.nodeModel, 
        config.nodeView, 
        config.nodeController
    );
    Map.initialize();
    return Map;
}


//////////////////

// text map

// rules:
//   1- all models, controllers, and views need an init function.
//   2- init functions all take in a parent param (the node)
//   3- view and controller's init also takes in model param

TextNodeModel = function(){
    this.init = function(parent){
        self.parent = parent;
        BaseNodeModel.call(this);
        this.initialize(parent);
        this.initData(parent.vectorLength);
        this.initRandomData();
    }.bind(this);
}

TextNodeView = function(){
    this.init = function(parent, model){
        self.parent = parent;
        BaseNodeView.call(this);
        this.initialize(parent, model);
        this.initTextObject();
    }.bind(this);
}

TextNodeController = function(){
    this.init = function(parent, model){
        self.parent = parent;
        BaseNodeController.call(this);
        this.initialize(parent, model);
    }.bind(this);
}


/////////////////////////////////////

ColorNodeModel = function(){
    this.init = function(parent){
        self.parent = parent;
        BaseNodeModel.call(this);
        this.initialize(parent);
        this.initData(parent.vectorLength);
        this.initRandomData();
    }.bind(this);
}

ColorNodeView = function(){
    this.init = function(parent, model){
        this.parent = parent;
        BaseNodeView.call(this);
        this.initialize(parent, model);
        
        var self = this;
      
        this.draw = function(ctx){
            
            ctx.beginPath();
            //ctx.arc(this.parent.col * 10 + 10, 
            //             this.parent.row * 10 + 10,
            //             5, 0, 2 * Math.PI);
            ctx.rect(this.parent.col * 10, this.parent.row * 10,
                         10, 9);      
            ctx.fillStyle = "rgb("
              +Math.round(this.model.data[0]*255)+", "
              +Math.round(this.model.data[1]*255)+", "
              +Math.round(this.model.data[2]*255)+")";
            ctx.fill();
            ctx.stroke();
            //console.log("canvas here now");
        }.bind(this);
    }.bind(this);
  
    
}

ColorNodeController = function(){
    this.init = function(parent, model){
        self.parent = parent;
        BaseNodeController.call(this);
        this.initialize(parent, model);
    }.bind(this);
}



///// initialize instance ////////////////////


var colorConfig = {

    rows: 49,
    columns: 36,
    vectorLength: 3,

    nodeModel: ColorNodeModel,
    nodeView: ColorNodeView,
    nodeController: ColorNodeController
};

var myMap = buildMap(colorConfig);


///// set up UI ////////////////////


var All = new tabris.Button({
  left: 0, top: 490,
  text: "All"
}).appendTo(page);

var Blue = new tabris.Button({
  left: 75, top: 490,
  text: "Blue"
}).appendTo(page);

var Start = new tabris.Button({
  left: 150, top: 490,
  text: "Start"
}).appendTo(page);

var Stop = new tabris.Button({
  left: 225, top: 490,
  text: "Stop"
}).appendTo(page);

var Thousand = new tabris.Button({
  left: 300, top: 490,
  text: "1000"
}).appendTo(page);

var interval;


var updateRainbow = function(){
   var input = [];
   input.push(Math.random());
   input.push(Math.random());
   input.push(Math.random());
  
   myMap.update(input);
}

var updateBlue = function(){
   var input = [];
   input.push(0);
   input.push(0);
   input.push(Math.random());
  
   myMap.update(input);
}

var chosenUpdate = updateRainbow;

// Change the text view's text when the button is pressed
Start.on("select", function() {
    interval = setInterval(function(){
       chosenUpdate();
       myMap.draw();
    }, 5);  
});
  
Stop.on("select", function() {
    clearInterval(interval);
});

All.on("select", function() { 
    chosenUpdate = updateRainbow;
});

Blue.on("select", function() {
    
    chosenUpdate = updateBlue;
});

Thousand.on("select", function() {
    for(var i = 0 ; i < 1000; i++){
       chosenUpdate();
    }
    myMap.draw();
});



 
page.open();

      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      
      