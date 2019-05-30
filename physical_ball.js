var setting = {
    //when the ball reach border
    //That's all the choices : rebound[1] , across[2] , disappear[3] , across2[4]
    border_event : 1,
    friction : 0.1,
    //How many meters is a pixel
    scale : 0.5,
    //gravitational constant
    G : 1,
}
var ball_list = [];

var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');
ctx.clear = function(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
}
resizeCanvas();

for(let i = 0; i < 32; i++){
    ball_list.push(new Ball(i));
}

render();

//requestAnimationFrame function , This function is executed every frame of the canvas
function render() { 
    ctx.clear();
    //paint the balls
    paintBalls();
    //Handle all physical effects
    processing();
    requestAnimationFrame(render); 
}

function processing(){
    var effect_enabled = [
        adjustRadius,
        moveMent,
        gravityEffect,
        collisionJudge,
        preventTooFast,
        //frictionEffect,
    ];

    for(ball of ball_list){
        for(effect of effect_enabled){
            effect(ball);
        }
    }

    for(ball of ball_list){
        ball.flushData();
    }

}

function adjustRadius(ball){
    
    if ((radius = Math.pow(3*ball.mass/(4*ball.density*Math.PI), 1/3) / setting.scale) > 1){
        ball.radius = radius;
    }else{
        ball.radius = 3;
    }
}

function moveMent(ball){
    ball.position.x += ball.speed.x;
    ball.position.y += ball.speed.y;
    switch(setting.border_event){
        case 1:
            if(ball.position.x - ball.radius <= 0 || ball.position.x + ball.radius >= window.innerWidth){
                ball.speed.x *= -1;
            }
            if(ball.position.y - ball.radius <= 0 || ball.position.y + ball.radius >= window.innerHeight){
                ball.speed.y *= -1;
            }
        break;
        case 2:
            if(ball.position.x < 0){
                ball.position.x = window.innerWidth;
            }
            if(ball.position.x > window.innerWidth){
                ball.position.x = 0;
            }
            if(ball.position.y < 0){
                ball.position.y = window.innerHeight;
            }
            if(ball.position.y > window.innerHeight){
                ball.position.y = 0;
            }
        break;
        case 3:
            ball_list.splice(ball.id,1);
        break;
        case 4:
            if(ball.position.x < 0){
                ball.position.x = window.innerWidth;
                ball.position.y = window.innerHeight - ball.position.y;
            }
            if(ball.position.x > window.innerWidth){
                ball.position.x = 0;
                ball.position.y = window.innerHeight - ball.position.y;
            }
            if(ball.position.y < 0){
                ball.position.y = window.innerHeight;
                ball.position.x = window.innerWidth - ball.position.x;
            }
            if(ball.position.y > window.innerHeight){
                ball.position.y = 0;
                ball.position.x = window.innerWidth - ball.position.x;
            }
        break;
    }
    
}

function gravityEffect(ball_a){
    if(!ball_a.subjectToGravity){
        return;
    }
    G = setting.G;
    for(ball_b of ball_list){
        if(ball_a.gravity_be['from_'+ball_b.id] == undefined && ball_a.id != ball_b.id && ball_b.subjectToGravity){
            var vector = ball_a.vectorTo(ball_b);
            var distance = normOfVector(vector);
            var gravity = G * ball_a.mass * ball_b.mass / Math.pow(distance,2);
            var actual_distance = distance - ball_a.radius - ball_b.radius;
            var average_radius = (ball_a.radius + ball_b.radius) / 2;
            if(actual_distance >= average_radius * 2){
                gravity *= 1;
            }else if(actual_distance >= average_radius * 1.5){
                gravity *= 0.85;
            }else if(actual_distance >= average_radius * 1.0){
                gravity *= 0.6;
            }else if(actual_distance >= average_radius * 0.5){
                gravity *= 0.4;
            }else if(actual_distance >= average_radius * 0.25){
                gravity *= 0.1;
            }else{
                gravity *= 0;
            }

            ball_a.gravity_be['from_'+ball_b.id] = {
                x : vector.x / distance * gravity,
                y : vector.y / distance * gravity,
            }
            ball_b.gravity_be['from_'+ball_a.id] = {
                x : - vector.x / distance * gravity,
                y : - vector.y / distance * gravity,
            };
        }
    }
    var vector = {
        x : 0,
        y : 0
    }
    for (gravity_vector in ball_a.gravity_be){
        vector.x += ball_a.gravity_be[gravity_vector].x;
        vector.y += ball_a.gravity_be[gravity_vector].y;
    }
    ball_a.speed.x += vector.x / ball_a.mass;
    ball_a.speed.y += vector.y / ball_a.mass;
}

function preventTooFast(ball){
    if(normOfVector(ball.speed) >= 14){
        ball.speed.x /= 4;
        ball.speed.y /= 4;
    }
}

//prevent two balls overlap when they collise with high speed
//this function was called in function collsionJudge()
function preventOverlap(ball_a,ball_b){
    x_after_a = ball_a.position.x + ball_a.speed.x;
    y_after_a = ball_a.position.y + ball_a.speed.y;
    x_after_b = ball_b.position.x + ball_b.speed.x;
    y_after_b = ball_b.position.y + ball_b.speed.y;
    var x = x_after_a - x_after_b;
    var y = y_after_a - y_after_b;
    if(Math.sqrt(x*x + y*y) <= ball_a.radius + ball_b.radius){
        ball_a.position.x += ball_a.speed.x;
        ball_a.position.y += ball_a.speed.y;
        ball_b.position.x += ball_b.speed.x;
        ball_b.position.y += ball_b.speed.y;
        preventOverlap(ball_a,ball_b);
    }
}

//collision
function collisionJudge(ball_a){
    if(!ball_a.subjectToCollision){
        return;
    }
    for(ball_b of ball_list){
        if(ball_a.distanceTo(ball_b) <= ball_a.radius + ball_b.radius && ball_a.id != ball_b.id && ball_a.collision_ed.indexOf(ball_b.id) == -1 && ball_b.collision_ed.indexOf(ball_a.id) == -1 && ball_b.subjectToCollision){
            m1 = ball_a.mass;
            m2 = ball_b.mass;
            v1 = ball_a.speed.x;
            v2 = ball_b.speed.x;
            ball_a.speed.x = ((m1 - m2)*v1 + 2*m2*v2) / (m1 + m2);
            ball_b.speed.x = ((m2 - m1)*v2 + 2*m1*v1) / (m1 + m2);
            v1 = ball_a.speed.y;
            v2 = ball_b.speed.y;
            ball_a.speed.y = ((m1 - m2)*v1 + 2*m2*v2) / (m1 + m2);
            ball_b.speed.y = ((m2 - m1)*v2 + 2*m1*v1) / (m1 + m2);
            preventOverlap(ball_a,ball_b)
            ball_a.collision_ed.push(ball_b.id);
            ball_b.collision_ed.push(ball_a.id);
        }
    }
}

function frictionEffect(){

}

function paintBalls(){
    for(ball of ball_list){
        if(ball.visible)
            ball.paint();
    }
}

function Ball(id){
    this.id = id;
    this.position = {
        x : Math.floor(Math.random()*window.innerWidth + 1),
        y : Math.floor(Math.random()*window.innerHeight + 1),
    };
    this.speed = {
        x : Math.floor(Math.random()*5 - 2.5),
        y : Math.floor(Math.random()*5 - 2.5),
    }
    this.density = 1;
    this.mass = Math.floor(Math.random()*400 + 100);
    this.gravity_be = {};
    this.collision_ed = [];
    this.color = '#fff';
    this.radius = 5 * this.mass / 100;
    this.shadowBlur = 10;
    this.shadowColor = '#000';
    this.visible = true;
    this.subjectToGravity = true;
    this.subjectToCollision = true;
    this.paint = function(){
        ctx.shadowBlur = this.shadowBlur;
        ctx.shadowColor = this.shadowColor;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position.x,this.position.y,this.radius,0,2*Math.PI,false);
        ctx.closePath();
        ctx.fill();
    };
    this.distanceTo = function(anotherBall){
        x = Math.abs(this.position.x - anotherBall.position.x);
        y = Math.abs(this.position.y - anotherBall.position.y);
        return Math.sqrt(x*x + y*y);
    };
    this.vectorTo = function(anotherBall){
        return {
            x : anotherBall.position.x - this.position.x,
            y : anotherBall.position.y - this.position.y,
        };
    }
    this.flushData = function(){
        this.collision_ed = [];
        this.gravity_be = {};
    }
}

function normOfVector(vector){
    return Math.sqrt(vector.x*vector.x + vector.y*vector.y);
}

window.addEventListener('resize',function(e){
    resizeCanvas();
})

function resizeCanvas(){
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
}
