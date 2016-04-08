var bodyParser = require('body-parser'); 	// get body-parser
var User       = require('../models/user');
var Challenges = require('../models/challenge')
var jwt        = require('jsonwebtoken');
var config     = require('../../config');

// super secret for creating tokens
var superSecret = config.secret;

module.exports = function(app, express) {

	var apiRouter = express.Router();

	// route to generate sample user
	apiRouter.post('/sample', function(req, res) {

		// look for the user named chris
		User.findOne({ 'username': 'chris' }, function(err, user) {

			// if there is no chris user, create one
			if (!user) {
				var sampleUser = new User();

				sampleUser.name = 'Chris';  
				sampleUser.username = 'chris'; 
				sampleUser.password = 'supersecret';

				sampleUser.save();
			} else {
				console.log(user);

				// if there is a chris, update his password
				user.password = 'supersecret';
				user.save();
			}

		});

	});

	// route to authenticate a user (POST http://localhost:8080/api/authenticate)
	apiRouter.post('/authenticate', function(req, res) {

	  // find the user
	  User.findOne({
	    username: req.body.username
	  }).select('name username password').exec(function(err, user) {

	    if (err) throw err;

	    // no user with that username was found
	    if (!user) {
	      res.json({ 
	      	success: false, 
	      	message: 'Authentication failed. User not found.' 
	    	});
	    } else if (user) {

	      // check if password matches
	      var validPassword = user.comparePassword(req.body.password);
	      if (!validPassword) {
	        res.json({ 
	        	success: false, 
	        	message: 'Authentication failed. Wrong password.' 
	      	});
	      } else {

	        // if user is found and password is right
	        // create a token
	        var token = jwt.sign({
	        	_id: user._id,                                                   //STOCK l'ID du user dans le token
	        	name: user.name,
	        	username: user.username
	        }, superSecret, {
	          expiresInMinutes: 1440 // expires in 24 hours
	        });

	        // return the information including token as JSON
	        res.json({
	          success: true,
	          message: 'Enjoy your token!',
	          token: token
	        });
	      }   

	    }

	  });
	});

	// route middleware to verify a token
	apiRouter.use(function(req, res, next) {
		// do logging
		console.log('Somebody just came to our app!');

	  // check header or url parameters or post parameters for token
	  var token = req.body.token || req.query.token || req.headers['x-access-token'];

	  // decode token
	  if (token) {

	    // verifies secret and checks exp
	    jwt.verify(token, superSecret, function(err, decoded) {      

	      if (err) {
	        res.status(403).send({ 
	        	success: false, 
	        	message: 'Failed to authenticate token.' 
	    	});  	   
	      } else { 
	        // if everything is good, save to request for use in other routes
	        req.decoded = decoded;
	            
	        next(); // make sure we go to the next routes and don't stop here
	      }
	    });

	  } else {

	    // if there is no token
	    // return an HTTP response of 403 (access forbidden) and an error message
   	 	res.status(403).send({ 
   	 		success: false, 
   	 		message: 'No token provided.' 
   	 	});
	    
	  }
	});

	// test route to make sure everything is working 
	// accessed at GET http://localhost:8080/api
	apiRouter.get('/', function(req, res) {
		res.json({ message: 'hooray! welcome to our api!' });	
	});

	// on routes that end in /users
	// ----------------------------------------------------
	apiRouter.route('/users')

		// create a user (accessed at POST http://localhost:8080/users)
		.post(function(req, res) {
			
			var user = new User();		// create a new instance of the User model
			user.name = req.body.name;  // set the users name (comes from the request)
			user.username = req.body.username;  // set the users username (comes from the request)
			user.password = req.body.password;  // set the users password (comes from the request)
			user.credit = 50; //POUR CETTE VERSION TEST, CHAQUE NOUVEL UTILISATEUR SE VOIT OFFRIR 50e A LA CREATION DU COMPTE

			user.save(function(err) {
				if (err) {
					// duplicate entry
					if (err.code == 11000) 
						return res.json({ success: false, message: 'A user with that username already exists. '});
					else 
						return res.send(err);
				}

				// return a message
				res.json({ message: 'User created!' });
			});

		})

		
		// get all the users (accessed at GET http://localhost:8080/api/users)
		.get(function(req, res) {

			User.find({}, function(err, users) {
				if (err) res.send(err);

				// return the users
				res.json(users);
			});
		});
	


	//ON ROUTES THAT END IN CHALLENGES !
	apiRouter.route('/challenges')
		//cette fonction va chercher l'identité de l'utilisateur stockée dans son token puis l'utilise pour lui créer un nouveau challenge

		.post(function(req,res){
			var challenge = new Challenges()
			var user_id = req.decoded._id;
			console.log('User : ' + user_id);

			challenge.title = req.body.title;
			challenge.amount = req.body.amount; //ATTENTION IL FAUDRA CHECKER QUE LE MEC A SUFFISAMENT de crédit EN STOCK et aussi débiter le stock du gars après création
			challenge.due_date = req.body.date; //Attention il faudra que cette date soit bien stockée dans le format "date" de javascript pour éviter les problèmes après...
			challenge.proprietary_user_id = user_id;

			//Chercher le nombre de crédits dispo sur le compte user, ensuite créer le challenge si sufisament de crédits
			User.find({"_id":user_id},{"_id":0,"credit":1}, function(err, result){
            	var cash = result[0].credit
           		console.log('Available user cash : ' + cash);
            
				if(cash<challenge.amount) res.send({message:"Not enough credits available"});
				else{
					//Sauver le nouveau challenge dans la DB des challenges
					challenge.save(function(err) {
						if (err) res.send(err);
						// return a message
						res.json({ message: 'Challenge created!' });
					
					//enlever des crédits à l'utilisateur concerné
					var new_credit = cash - challenge.amount;
					console.log("New value : "+new_credit);
					User.update({ "_id" : user_id },{ $set: { "credit": new_credit} }, function(err, results) {			        
					   });
					});
				}
			})
		
		})



		//cette fonction va chercher l'identité de l'utilisateur stockée dans son token puis l'utilise pour charger les challenges de l'utilisateur
		//FAUDRA FAIRE UN TRUC ICI POUR CHARGER LES TACHES ASSOCIEES AU CHALLENGE
		.get(function(req, res) {
			var user_id = req.decoded._id;
			Challenges.find({"proprietary_user_id":user_id}, function(err, challenges) {                     
				if (err) res.send(err);

				//return matching challenges
				res.json(challenges);
			});
		});

		
		



	// on routes that end in /users/:user_id
	// ----------------------------------------------------
	apiRouter.route('/users/:user_id')

		// get the user with that id
		.get(function(req, res) {
			User.findById(req.params.user_id, function(err, user) {
				if (err) res.send(err);

				// return that user
				res.json(user);
			});
		})

		// update the user with this id
		.put(function(req, res) {
			User.findById(req.params.user_id, function(err, user) {

				if (err) res.send(err);

				// set the new user information if it exists in the request
				if (req.body.name) user.name = req.body.name;
				if (req.body.username) user.username = req.body.username;
				if (req.body.password) user.password = req.body.password;

				// save the user
				user.save(function(err) {
					if (err) res.send(err);

					// return a message
					res.json({ message: 'User updated!' });
				});

			});
		})

		// delete the user with this id
		.delete(function(req, res) {
			User.remove({
				_id: req.params.user_id
			}, function(err, user) {
				if (err) res.send(err);

				res.json({ message: 'Successfully deleted' });
			});
		});



			


	// api endpoint to get user information
	apiRouter.get('/me', function(req, res) {
		res.send(req.decoded);
	});

	return apiRouter;
};