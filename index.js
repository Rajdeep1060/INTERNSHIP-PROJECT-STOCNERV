const express=require("express");
const app=express();
const mysql=require("mysql");
const ejs=require("ejs");
// const session=require("express-session");
const jwt=require("jsonwebtoken");
// const memoryusage=process.memoryUsage();
const bodyparser=require("body-parser");
const cache=require("memory-cache");
const morgan=require("morgan");
const cookieparser=require("cookie-parser");
app.set('view engine',ejs); 
app.use(express.static(`${__dirname}/public`));
app.use(bodyparser.urlencoded({extended:true}));
const config=require("./configurations/config");
const port=5000;
app.use(cookieparser());
var con = mysql.createConnection({
   host:config.host,
   user:config.user,
   password:config.password,
   database:config.database
});
// ProtectedRoutes.use((req, res, next) =>{
//     // check header for the token
//     var token = req.headers['access-token'];
//     // decode token
//     if (token) {
//         console.log(token);
//       // verifies secret and checks if the token is expired
//       jwt.verify(token, app.get('Secret'), (err, decoded) =>{      
//         if (err) {
//           return res.json({ message: 'invalid token' });    
//         } else {
//           // if everything is good, save to request for use in other routes
//           req.decoded = decoded;    
//           next();
//         }
//       });

//     } else {

//       // if there is no token  

//     res.redirect("/sign");
//       }
//   });
if(!con){
    console.log("DB connection failed");
}
app.use(morgan('dev'));
app.get("/",(req,res)=>{
    res.sendFile(__dirname+"/TradesOnTheHouse.html", (err) => {
        if (err) {
          console.log(err);
          res.end(err.message);
        }
      });
    }
)
// app.get('/show-alert', function(req, res) {
//    res.send('Message Sent!');
// });
app.get("/sign",(req,res)=>{
    res.sendFile(__dirname+"/public/html/main.html",(err)=>{
        console.log("I am sign");
        console.log(err);
    });
})
app.get("/about",(req,res)=>{
    res.sendFile(__dirname+'/public/html/aboutUs.html',(err)=>{
        console.log("i am about");
        console.log(err);
    });
})
app.get("/contact",(req,res)=>{

    res.sendFile(__dirname+'/public/html/ContactUs.html',(err)=>{
        console.log("i am contact");
        console.log(err);
    });
})
app.get("/plus",(req,res)=>{
    res.sendFile(__dirname+"/public/html/TradesOnTheHousePlus.html",(error)=>{
        console.log("I am plus ");
        console.log(error);
    });
})
app.post("/contactdata",(req,res)=>{
    let name=req.body.name;
    let email=req.body.email;
    let phone=req.body.phone;
    let message=req.body.message;
    let sql=`insert into contact(name,email,phone,message) values ('${name}','${email}','${phone}','${message}')`;
    con.query(sql,(error,result)=>{
        if(error){
            console.log("This error occurred in contact data");
            console.log(err);
        }
        else{
            console.log("contact data saved");
            res.redirect("/contact");
        }
    })
})
app.post("/login",(req,res)=>{
     let email=req.body.email;
     let password=req.body.password;
    //  con.connect((err)=>{
    //     if(err){
    //         console.log(err);
    //     }
        let sql=`select * from user where email='${email}' and password='${password}'`;
        con.query(sql,(err,result)=>{
            if(err){
                res.json(err);
                console.log(err);
                throw err;
            }
            if(Object.keys(result).length>0){
                console.log("inside login");
                const token = jwt.sign({email:email},config.secret,{expiresIn:'3d'});
                // maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
                console.log(token);
                res.cookie('jwt', token, { httpOnly: true,maxAge:1000*60*60*24*3});
                res.redirect("/data");
            }
            else{
                res.sendFile(__dirname+'/public/html/faillog.html');
            }
        })
     })
     
// })
app.post("/register",(req,res)=>{
    let name=req.body.name;
    let email=req.body.email;
    let password=req.body.password;
    // console.log(name);
    // console.log(email);
    // console.log(password);
    // con.connect((err)=>{
    //    if(err) throw err;
        //check user
        con.query(`select * from user where name='${name}'`,(err,result)=>{
            if(err) throw err;
            if(Object.keys(result).length>0){
                res.sendFile(__dirname+'/public/html/failreg.html');
            }
            else{
                var sql = `INSERT INTO user (name,email, password) VALUES ('${name}','${email}','${password}' )`;
                con.query(sql, function (err, result) {
                    if (err){
                        console.log(err);
                    }
                    else{
                        const token = jwt.sign({email:email},config.secret,{expiresIn:'3d'});
                        console.log(token);
                        res.cookie('jwt', token, { httpOnly: true,maxAge:1000*60*60*24*3});
                       res.redirect("/data");
                    };
                });
            }
        })
    })
const verify = (req, res, next) => {
    if(typeof req.cookies.jwt=== 'undefined'){
        res.redirect("/sign");
    }
    else{
   const token=req.cookies.jwt;
  if (token) {
    jwt.verify(token,config.secret,(err,decoded)=>{
        if(err){
            console.log(err);
            res.redirect("/sign");
        }
        else{
            console.log("decoded:- "+ decoded);
            next();
        }
    })
    // Credentials are valid, proceed to the next middleware
  }
  else{
    res.redirect("/sign");
  }
   }
}
app.get("/data",verify,(req,res)=>{
    const cachedResult = cache.get('data');
        if (cachedResult) {
            console.log("This is cached data");
     // Return the cached result
          res.render("data.ejs",{result:cachedResult});
          return;
        }
        //query the database and put data in cache
        let sq=`select * from data` ;
        con.query(sq,(err,result)=>{
            if(err){ console.log(err);
                res.status(500).send('Internal server error '+err);
            }
            else{
                cache.put('data',result,86400000);
                //after 1 day data will be removed from cache and it needs to be re-cached
                console.log("query is used");
                res.render("data.ejs",{result:result});
            }
        })
        }
    )
app.get('/logout', (req, res) => {
        res.clearCookie('jwt');
        res.redirect("/");
      });
app.get('/analysis', (req, res) => {
    // Select the text and images from the database
    con.query("SELECT * FROM analysis", (error, result) => {
        if(error){
            console.log(error);
        }
        // Check if there are any results
        if (result.length  >  0) {
            // Store the text and images in an array
            // const content = array();
            // for (let i = 0; i < results.length; i++) {
            //     content.push(results[i]);
            // }
        //    console.log(result);
            // Render the EJS template and pass the content array as a local variable
            res.render('analysis.ejs', { result: result });
        } else {
            console.log("No content found.");
        }
    });
});

// Start the server
// app.get("/clear",(req,res)=>{
//     res.send("Cache is cleared");
//     cache.clear();
// })
app.listen(port,()=>{
    console.log(`server is running on http://localhost:${port}`);
})
