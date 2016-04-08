var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

// user schema 
var ChallengeSchema   = new Schema({
	title: {type: String, required: true},
	amount: { type: Number, required: true},
	due_date: {type: Date, required: true},
	proprietary_user_id: {type: String, required: true}
	
});

module.exports = mongoose.model('Challenges', ChallengeSchema);