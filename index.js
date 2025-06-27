const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

const PORT = process.env.PORT || 5000;

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/' , (req , res) => {
    res.send("Portfolio Server is Running....")
})

app.listen(PORT , () => {
    console.log("Server is Running at port : " , PORT)
})