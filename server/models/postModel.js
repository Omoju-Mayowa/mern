import { default as mongoose, Schema } from 'mongoose'

// POST Schema
const postSchema = new Schema ({
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User" },
    // title: { type: String, required: true },

    // category 
    category: {type: String, required: true},
}, {timestamps: true})


const Post = mongoose.model('Post', postSchema)

export default Post


