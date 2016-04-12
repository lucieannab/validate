angular.module('challengeCtrl', ['challengeService'])

//EN CONSTRUCTION

.controller('challengeController', function(Challenge) {

	var vm = this;

	// set a processing variable to show loading things
	vm.processing = true;

	// grab all the challenges at page load
	Challenge.all()
		.success(function(data) {

			// when all the challenges come back, remove the processing variable
			vm.processing = false;

			// bind the challenges that come back to vm.challenges
			vm.challenges = data;
		});

})	

	// controller applied to user creation page
.controller('challengeCreateController', function(User) {
	
	var vm = this;

	// variable to hide/show elements of the view
	// differentiates between create or edit pages
	vm.type = 'create';

	// function to create a user
	vm.saveChallenge = function() {
		vm.processing = true;
		vm.message = '';

		// use the create function in the userService
		Challenge.create(vm.challengeData)
			.success(function(data) {
				vm.processing = false;
				vm.challengeData = {};
				vm.message = data.message;
			});
			
	};	

});

