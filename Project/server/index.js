const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")

const app = express()
app.use(cors())

const PORT = process.env.PORT || 27017

mongoose.connect("mongodb+srv://aniketha:aniketha123456@tribalframework.mi4wes4.mongodb.net/?retryWrites=true&w=majority")
.then(()=>console.log("Connected to DB"))
.catch((err)=>console.log(err))

app.get("/",(req,res)=>{
    res.json({message:"Server is running"})
})

app.listen(PORT,()=>console.log("Server is running"))