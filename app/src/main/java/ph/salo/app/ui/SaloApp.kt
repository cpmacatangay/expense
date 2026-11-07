package ph.salo.app.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import ph.salo.app.R
import ph.salo.app.feature.app.AppViewModel
import ph.salo.app.feature.history.HistoryScreen
import ph.salo.app.feature.home.HomeScreen
import ph.salo.app.feature.ledger.LedgerScreen
import ph.salo.app.feature.outing.NewOutingScreen
import ph.salo.app.feature.outing.OutingDetailScreen
import ph.salo.app.feature.settings.SettingsScreen
import ph.salo.app.feature.students.StudentsScreen
import ph.salo.app.ui.components.SaloAvatar

private sealed class SaloDestination(
    val route: String,
    @StringRes val labelRes: Int,
    val icon: ImageVector
) {
    data object Home : SaloDestination("home", R.string.nav_home, Icons.Filled.Home)
    data object Students : SaloDestination("students", R.string.nav_students, Icons.Filled.Group)
    data object Ledger : SaloDestination("ledger", R.string.nav_ledger, Icons.Filled.AccountBalanceWallet)
    data object History : SaloDestination("history", R.string.nav_history, Icons.Filled.History)
    data object Settings : SaloDestination("settings", R.string.nav_settings, Icons.Filled.Settings)
}

// Declared outside the sealed class on purpose. A companion-object initializer inside
// SaloDestination runs while that class is still initializing, so the `data object`
// entries can be observed as null. A file-level val is initialized after the objects.
private val mainDestinations: List<SaloDestination> = listOf(
    SaloDestination.Home,
    SaloDestination.Students,
    SaloDestination.Ledger,
    SaloDestination.History,
    SaloDestination.Settings
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaloApp(
    viewModel: AppViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val adults by viewModel.adults.collectAsStateWithLifecycle()
    val selectedAdult by viewModel.selectedAdult.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination
    val currentRoute = currentDestination?.route ?: SaloDestination.Home.route
    val switchProfileAction = stringResource(R.string.switch_profile_action)
    val switchProfileDescription = stringResource(
        R.string.switch_profile_description,
        selectedAdult?.name ?: "—"
    )

    LaunchedEffect(message) {
        val text = message ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(text)
        viewModel.clearMessage()
    }

    Scaffold(
        topBar = {
            if (mainDestinations.any { it.route == currentRoute }) {
                TopAppBar(
                    title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            painter = painterResource(R.drawable.ic_launcher_monochrome),
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier
                                .size(30.dp)
                                .padding(end = 8.dp)
                        )
                        Text(
                            text = stringResource(R.string.app_name),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                },
                actions = {
                    var expanded by remember { mutableStateOf(false) }
                    Box {
                        Row(
                            modifier = Modifier
                                .padding(end = 8.dp)
                                .heightIn(min = 48.dp)
                                .clickable(
                                    onClickLabel = switchProfileAction,
                                    role = Role.Button
                                ) { expanded = true }
                                .semantics {
                                    contentDescription = switchProfileDescription
                                }
                                .padding(horizontal = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            SaloAvatar(name = selectedAdult?.name ?: "?", size = 32.dp)
                            Text(
                                text = selectedAdult?.name ?: "",
                                style = MaterialTheme.typography.labelLarge,
                                modifier = Modifier.padding(start = 6.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            adults.forEach { adult ->
                                DropdownMenuItem(
                                    text = { Text(adult.name) },
                                    onClick = {
                                        viewModel.selectAdult(adult.id)
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
                )
            }
        },
        bottomBar = {
            if (mainDestinations.any { it.route == currentRoute }) {
                NavigationBar {
                    mainDestinations.forEach { destination ->
                        NavigationBarItem(
                            selected = currentDestination?.hierarchy?.any {
                                it.route == destination.route
                            } == true,
                            onClick = {
                                // Do not save/restore the stack here: in-app links to Ledger or
                                // History push those onto the Home stack, and restoring it later
                                // reopened the wrong tab. Pop back to the start destination and
                                // push the tapped tab, which always lands where the user asked.
                                navController.navigate(destination.route) {
                                    popUpTo(navController.graph.startDestinationId)
                                    launchSingleTop = true
                                }
                            },
                            icon = {
                                Icon(destination.icon, contentDescription = stringResource(destination.labelRes))
                            },
                            label = { Text(stringResource(destination.labelRes)) }
                        )
                    }
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = SaloDestination.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(SaloDestination.Home.route) {
                HomeScreen(
                    selectedAdult = selectedAdult,
                    onOutingClick = { navController.navigate("outing/$it") },
                    onNewOuting = { navController.navigate("new_outing") },
                    onLedger = { navController.navigate(SaloDestination.Ledger.route) },
                    onHistory = { navController.navigate(SaloDestination.History.route) }
                )
            }
            composable(SaloDestination.Students.route) {
                StudentsScreen()
            }
            composable(SaloDestination.Ledger.route) {
                LedgerScreen(selectedAdult = selectedAdult)
            }
            composable(SaloDestination.History.route) {
                HistoryScreen(onOutingClick = { navController.navigate("outing/$it") })
            }
            composable(SaloDestination.Settings.route) {
                SettingsScreen()
            }
            composable(
                route = "new_outing?outingId={outingId}",
                arguments = listOf(
                    navArgument("outingId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    }
                )
            ) { entry ->
                NewOutingScreen(
                    outingId = entry.arguments?.getString("outingId"),
                    onFinalized = { outingId ->
                        navController.navigate("outing/$outingId") {
                            popUpTo(SaloDestination.Home.route)
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }
            composable(
                route = "outing/{outingId}",
                arguments = listOf(navArgument("outingId") { type = NavType.StringType })
            ) {
                OutingDetailScreen(
                    onBack = { navController.popBackStack() },
                    onDeleted = {
                        navController.navigate(SaloDestination.Home.route) {
                            popUpTo(SaloDestination.Home.route) { inclusive = true }
                        }
                    },
                    onReopened = { outingId ->
                        navController.navigate("new_outing?outingId=$outingId")
                    }
                )
            }
        }
    }
}
